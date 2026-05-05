#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function runStep(label, args, options = {}) {
  console.log(`\n[distributed-proof-tools] ${label}`);
  const result = spawnSync(node, args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }

  const requiredFragments = Array.isArray(options.mustContain)
    ? options.mustContain
    : [];

  if (!Array.isArray(options.mustContain) && options.mustContain) {
    requiredFragments.push(options.mustContain);
  }

  for (const fragment of requiredFragments) {
    if (!result.stdout.includes(fragment)) {
      throw new Error(`${label} output did not include '${fragment}'.`);
    }
  }

  return result.stdout;
}

function runFailureStep(label, args, options = {}) {
  console.log(`\n[distributed-proof-tools] ${label}`);
  const result = spawnSync(node, args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status === 0) {
    throw new Error(`${label} unexpectedly passed.`);
  }

  const combinedOutput = `${result.stdout}${result.stderr}`;
  if (options.mustContain && !combinedOutput.includes(options.mustContain)) {
    throw new Error(`${label} output did not include '${options.mustContain}'.`);
  }

  return result.stdout;
}

function verifySelfTestJson(stdout) {
  let parsed;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `Verifier self-test did not emit valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (parsed?.ok !== true || !Array.isArray(parsed.checks)) {
    throw new Error("Verifier self-test JSON did not report a passing check set.");
  }

  const failedChecks = parsed.checks.filter((check) => check?.ok !== true);

  if (failedChecks.length > 0) {
    throw new Error(
      `Verifier self-test reported failed checks: ${failedChecks
        .map((check) => check?.name ?? "unknown")
        .join(", ")}`
    );
  }
}

function verifySelfTestFailureJson(stdout, expectedFailedCheckName) {
  let parsed;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `Verifier failing self-test did not emit valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (parsed?.ok !== false || !Array.isArray(parsed.checks)) {
    throw new Error("Verifier failing self-test JSON did not report a failing check set.");
  }

  const expectedFailure = parsed.checks.find(
    (check) =>
      check?.ok === false &&
      typeof check?.name === "string" &&
      check.name.includes(expectedFailedCheckName)
  );

  if (!expectedFailure) {
    throw new Error(
      `Verifier failing self-test did not include expected failed check '${expectedFailedCheckName}'.`
    );
  }
}

try {
  runStep("syntax check proof kit", [
    "--check",
    "scripts/federated-distributed-proof-kit.mjs"
  ]);
  runStep("syntax check verifier", [
    "--check",
    "scripts/federated-distributed-proof-verify.mjs"
  ]);
  runStep("syntax check proof profile contract", [
    "--check",
    "scripts/distributed-proof-profile.mjs"
  ]);

  runStep("proof kit help", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--help"
  ], {
    mustContain: "Usage: pnpm ops:distributed-proof-kit"
  });
  runStep("proof verifier help", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--help"
  ], {
    mustContain: "Usage: pnpm ops:distributed-proof-verify"
  });

  runStep("proof kit token dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--host-token",
    "dev-token",
    "--agent-node",
    "builder",
    "--user-node",
    "user",
    "--reviewer-user-node",
    "reviewer"
  ], {
    mustContain: "[dry-run] would write runner env/start scripts"
  });

  runStep("proof kit no-token dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--no-host-token-env-var",
    "--output",
    "/tmp/entangle-distributed-proof-ci-no-token",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777"
  ], {
    mustContain: "[dry-run] would write runner env/start scripts"
  });

  runStep("proof kit custom-engine dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci-custom-engine",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--agent-engine-kind",
    "external_process"
  ], {
    mustContain: "'external_process'"
  });

  runStep("proof kit external-http engine setup dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci-external-http",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--external-http-engine-url",
    "http://agent-engine.example:8080/turn"
  ], {
    mustContain: [
      "custom agent engine profile: distributed-external-http (external_http)",
      "host catalog agent-engine upsert 'distributed-external-http'",
      "--kind external_http",
      "--base-url 'http://agent-engine.example:8080/turn'",
      "host nodes agent-runtime 'builder'",
      '"agentEngineKind":"external_http"'
    ]
  });

  runStep("proof kit external-process engine setup dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci-external-process",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--external-process-engine-executable",
    "/usr/local/bin/entangle-agent-engine"
  ], {
    mustContain: [
      "custom agent engine profile: distributed-external-process (external_process)",
      "host catalog agent-engine upsert 'distributed-external-process'",
      "--kind external_process",
      "--executable '/usr/local/bin/entangle-agent-engine'",
      "host nodes agent-runtime 'builder'",
      '"agentEngineKind":"external_process"'
    ]
  });

  runStep("proof kit fake-opencode dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci-fake-opencode",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--fake-opencode-server-url",
    "http://127.0.0.1:18081",
    "--fake-opencode-username",
    "entangle",
    "--fake-opencode-password",
    "server-secret"
  ], {
    mustContain: [
      "fake OpenCode profile: distributed-fake-opencode -> http://127.0.0.1:18081",
      "host catalog agent-engine upsert 'distributed-fake-opencode'",
      "host nodes agent-runtime 'builder'",
      "OPENCODE_SERVER_USERNAME",
      "OPENCODE_SERVER_PASSWORD"
    ]
  });

  runFailureStep(
    "proof kit fake-opencode wrong engine dry-run",
    [
      "scripts/federated-distributed-proof-kit.mjs",
      "--dry-run",
      "--output",
      "/tmp/entangle-distributed-proof-ci-fake-opencode-wrong-engine",
      "--host-url",
      "http://host.example:7071",
      "--relay-url",
      "ws://relay.example:7777",
      "--agent-engine-kind",
      "external_process",
      "--fake-opencode-server-url",
      "http://127.0.0.1:18081"
    ],
    {
      mustContain:
        "--fake-opencode-server-url requires the agent runner to advertise opencode_server"
    }
  );

  runFailureStep(
    "proof kit external-http wrong engine dry-run",
    [
      "scripts/federated-distributed-proof-kit.mjs",
      "--dry-run",
      "--output",
      "/tmp/entangle-distributed-proof-ci-external-http-wrong-engine",
      "--host-url",
      "http://host.example:7071",
      "--relay-url",
      "ws://relay.example:7777",
      "--agent-engine-kind",
      "opencode_server",
      "--external-http-engine-url",
      "http://agent-engine.example:8080/turn"
    ],
    {
      mustContain:
        "--external-http-engine-url requires the agent runner to advertise external_http"
    }
  );

  runFailureStep(
    "proof kit conflicting external engines dry-run",
    [
      "scripts/federated-distributed-proof-kit.mjs",
      "--dry-run",
      "--output",
      "/tmp/entangle-distributed-proof-ci-conflicting-external-engine",
      "--host-url",
      "http://host.example:7071",
      "--relay-url",
      "ws://relay.example:7777",
      "--external-http-engine-url",
      "http://agent-engine.example:8080/turn",
      "--external-process-engine-executable",
      "/usr/local/bin/entangle-agent-engine"
    ],
    {
      mustContain:
        "Choose either --external-process-engine-executable or --external-http-engine-url"
    }
  );

  runStep("proof kit custom-profile verifier dry-run", [
    "scripts/federated-distributed-proof-kit.mjs",
    "--dry-run",
    "--output",
    "/tmp/entangle-distributed-proof-ci-custom-profile",
    "--host-url",
    "http://host.example:7071",
    "--relay-url",
    "ws://relay.example:7777",
    "--git-service-ref",
    "gitea",
    "--check-relay-health",
    "--check-git-backend-health",
    "--check-published-git-ref",
    "--require-external-host-url",
    "--require-external-user-client-urls",
    "--require-user-client-basic-auth",
    "--user-client-basic-auth-env-var",
    "ENTANGLE_PROOF_USER_CLIENT_BASIC_AUTH",
    "--agent-runner",
    "proof-agent-runner",
    "--user-runner",
    "proof-user-runner",
    "--reviewer-user-runner",
    "proof-reviewer-runner",
    "--agent-node",
    "architect",
    "--user-node",
    "alice",
    "--reviewer-user-node",
    "bob",
    "--agent-engine-kind",
    "external_process"
  ], {
    mustContain: [
      '--profile "$SCRIPT_DIR/proof-profile.json"',
      '${ENTANGLE_PROOF_JUNIT_DIR:+--junit "$ENTANGLE_PROOF_JUNIT_DIR/topology.xml"}',
      '${ENTANGLE_PROOF_JUNIT_DIR:+--junit "$ENTANGLE_PROOF_JUNIT_DIR/artifacts.xml"}',
      "--check-relay-health",
      "--require-external-host-url",
      "--require-external-user-client-urls",
      "--require-artifact-evidence",
      '"agentRunnerId":"proof-agent-runner"',
      '"userRunnerId":"proof-user-runner"',
      '"reviewerUserRunnerId":"proof-reviewer-runner"',
      '"agentNodeId":"architect"',
      '"userNodeId":"alice"',
      '"reviewerUserNodeId":"bob"',
      '"agentEngineKind":"external_process"',
      '"checkRelayHealth":true',
      '"checkGitBackendHealth":true',
      '"checkPublishedGitRef":true',
      '"checkUserClientHealth":true',
      '"gitServiceRefs":["gitea"]',
      '"requireExternalHostUrl":true',
      '"requireExternalUserClientUrls":true',
      '"requireConversation":true',
      '"requirePublishedGitArtifact":true',
      "run_cli user-nodes clients --summary --check-health",
      [
        "User Client Basic Auth required for human-interface runners via",
        "ENTANGLE_PROOF_USER_CLIENT_BASIC_AUTH"
      ].join(" ")
    ]
  });

  runFailureStep(
    "proof kit invalid user-client auth env var dry-run",
    [
      "scripts/federated-distributed-proof-kit.mjs",
      "--dry-run",
      "--output",
      "/tmp/entangle-distributed-proof-ci-invalid-user-client-auth-env",
      "--host-url",
      "http://host.example:7071",
      "--require-user-client-basic-auth",
      "--user-client-basic-auth-env-var",
      "INVALID-NAME"
    ],
    {
      mustContain:
        "--user-client-basic-auth-env-var must be a valid shell environment variable name"
    }
  );

  runFailureStep(
    "proof kit relay-health without relay dry-run",
    [
      "scripts/federated-distributed-proof-kit.mjs",
      "--dry-run",
      "--output",
      "/tmp/entangle-distributed-proof-ci-missing-relay",
      "--host-url",
      "http://host.example:7071",
      "--check-relay-health"
    ],
    {
      mustContain: "--check-relay-health requires at least one explicit --relay-url"
    }
  );

  const proofProfileTempDir = mkdtempSync(path.join(tmpdir(), "entangle-proof-profile-"));
  const proofProfilePath = path.join(proofProfileTempDir, "proof-profile.json");

  try {
    writeFileSync(
      proofProfilePath,
      `${JSON.stringify({
        agentEngineKind: "external_process",
        agentNodeId: "architect",
        agentRunnerId: "proof-agent-runner",
        checkGitBackendHealth: true,
        checkPublishedGitRef: true,
        checkRelayHealth: true,
        checkUserClientHealth: true,
        gitServiceRefs: ["gitea"],
        hostUrl: "http://host.example:7071",
        relayUrls: ["ws://relay.example:7777"],
        requireConversation: true,
        requireArtifactEvidence: true,
        requireExternalHostUrl: true,
        requirePublishedGitArtifact: true,
        reviewerUserNodeId: "bob",
        reviewerUserRunnerId: "proof-reviewer-runner",
        schemaVersion: 1,
        userNodeId: "alice",
        userRunnerId: "proof-user-runner"
      })}\n`,
      "utf8"
    );

    const profileSelfTestJson = runStep("proof verifier profile self-test", [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--profile",
      proofProfilePath
    ]);
    verifySelfTestJson(profileSelfTestJson);

    writeFileSync(
      proofProfilePath,
      `${JSON.stringify({
        agentEngineKind: "external_process",
        agentNodeId: "architect",
        agentRunnerId: "proof-agent-runner",
        assignments: [
          {
            assignmentId: "proof-agent-runtime-assignment",
            nodeId: "architect",
            runnerId: "proof-agent-runner",
            runtimeKinds: ["agent_runner"]
          },
          {
            assignmentId: "proof-alice-runtime-assignment",
            nodeId: "alice",
            runnerId: "proof-user-runner",
            runtimeKinds: ["human_interface"]
          },
          {
            assignmentId: "proof-bob-runtime-assignment",
            nodeId: "bob",
            runnerId: "proof-reviewer-runner",
            runtimeKinds: ["human_interface"]
          }
        ],
        hostUrl: "http://host.example:7071",
        reviewerUserNodeId: "bob",
        reviewerUserRunnerId: "proof-reviewer-runner",
        schemaVersion: 1,
        userNodeId: "alice",
        userRunnerId: "proof-user-runner"
      })}\n`,
      "utf8"
    );

    const customAssignmentProfileSelfTestJson = runStep(
      "proof verifier custom-assignment profile self-test",
      [
        "scripts/federated-distributed-proof-verify.mjs",
        "--self-test",
        "--json",
        "--profile",
        proofProfilePath
      ],
      {
        mustContain: "proof-agent-runtime-assignment"
      }
    );
    verifySelfTestJson(customAssignmentProfileSelfTestJson);

    writeFileSync(
      proofProfilePath,
      `${JSON.stringify({
        hostUrl: "http://host.example:7071",
        schemaVersion: 2
      })}\n`,
      "utf8"
    );

    runFailureStep(
      "proof verifier invalid-profile-version self-test",
      [
        "scripts/federated-distributed-proof-verify.mjs",
        "--self-test",
        "--json",
        "--profile",
        proofProfilePath
      ],
      {
        mustContain: "schemaVersion 1"
      }
    );

    writeFileSync(
      proofProfilePath,
      `${JSON.stringify({
        agentNodeId: "architect",
        agentRunnerId: "proof-agent-runner",
        assignments: [
          {
            assignmentId: "assignment-proof-agent-runner",
            nodeId: "architect",
            runnerId: "proof-agent-runner",
            runtimeKinds: ["human_interface"]
          }
        ],
        hostUrl: "http://host.example:7071",
        schemaVersion: 1
      })}\n`,
      "utf8"
    );

    runFailureStep(
      "proof verifier inconsistent-profile-assignment self-test",
      [
        "scripts/federated-distributed-proof-verify.mjs",
        "--self-test",
        "--json",
        "--profile",
        proofProfilePath
      ],
      {
        mustContain: "agent assignment must include runtime kind 'agent_runner'"
      }
    );
  } finally {
    rmSync(proofProfileTempDir, { force: true, recursive: true });
  }

  const artifactEvidenceJson = runStep("proof verifier artifact-evidence self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--require-artifact-evidence"
  ]);
  verifySelfTestJson(artifactEvidenceJson);

  const publishedGitArtifactJson = runStep(
    "proof verifier published-git-artifact self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--require-published-git-artifact"
    ]
  );
  verifySelfTestJson(publishedGitArtifactJson);

  const publishedGitRefJson = runStep(
    "proof verifier published-git-ref self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--check-published-git-ref"
    ]
  );
  verifySelfTestJson(publishedGitRefJson);

  const missingArtifactEvidenceJson = runFailureStep(
    "proof verifier missing-artifact-evidence self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--require-artifact-evidence",
      "--self-test-without-artifact-evidence"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(missingArtifactEvidenceJson, "artifact evidence");

  const missingPublishedGitArtifactJson = runFailureStep(
    "proof verifier missing-published-git-artifact self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--require-published-git-artifact",
      "--self-test-without-artifact-evidence"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(
    missingPublishedGitArtifactJson,
    "published git artifact"
  );

  const wrongPublishedGitRefJson = runFailureStep(
    "proof verifier wrong-published-git-ref self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--check-published-git-ref",
      "--self-test-wrong-published-git-ref"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(wrongPublishedGitRefJson, "published git ref");

  const relayHealthJson = runStep("proof verifier relay-health self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--check-relay-health",
    "--relay-url",
    "ws://relay.example:7777"
  ]);
  verifySelfTestJson(relayHealthJson);

  const missingRelayJson = runFailureStep(
    "proof verifier missing-relay self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--check-relay-health"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(missingRelayJson, "relay urls configured");

  const gitBackendHealthJson = runStep("proof verifier git-backend-health self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--check-git-backend-health",
    "--git-service-ref",
    "gitea"
  ]);
  verifySelfTestJson(gitBackendHealthJson);

  const fileGitBackendJson = runFailureStep(
    "proof verifier file-git-backend self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--check-git-backend-health",
      "--self-test-file-git-backend"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(fileGitBackendJson, "non-file remote");

  const missingGitServiceJson = runFailureStep(
    "proof verifier missing-git-service self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--check-git-backend-health",
      "--git-service-ref",
      "missing"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(missingGitServiceJson, "git service missing exists");

  const selfTestJson = runStep("proof verifier self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--require-conversation",
    "--check-user-client-health"
  ]);
  verifySelfTestJson(selfTestJson);

  const junitTempDir = mkdtempSync(path.join(tmpdir(), "entangle-proof-junit-"));
  const junitPath = path.join(junitTempDir, "proof.xml");
  runStep("proof verifier junit self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--require-conversation",
    "--check-user-client-health",
    "--junit",
    junitPath
  ]);
  const junitContent = readFileSync(junitPath, "utf8");
  if (
    !junitContent.includes('<testsuite name="entangle-distributed-proof"') ||
    !junitContent.includes('<testcase classname="entangle.distributedProof"')
  ) {
    throw new Error("Verifier JUnit self-test did not write the expected XML report.");
  }
  rmSync(junitTempDir, { force: true, recursive: true });

  const stoppedRuntimeJson = runFailureStep("proof verifier stopped-runtime self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--self-test-runtime-state",
    "stopped"
  ], {
    mustContain: '"ok": false'
  });
  verifySelfTestFailureJson(stoppedRuntimeJson, "runtime builder running");

  const stoppedRuntimeAllowedJson = runStep("proof verifier stopped-runtime allowed self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--self-test-runtime-state",
    "stopped",
    "--allow-non-running-runtimes"
  ]);
  verifySelfTestJson(stoppedRuntimeAllowedJson);

  const alternateAgentEngineJson = runStep("proof verifier alternate-agent-engine self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--agent-engine-kind",
    "external_process"
  ]);
  verifySelfTestJson(alternateAgentEngineJson);

  const sharedUserClientJson = runFailureStep("proof verifier shared-user-client self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--self-test-shared-user-client-url"
  ], {
    mustContain: '"ok": false'
  });
  verifySelfTestFailureJson(sharedUserClientJson, "user client urls distinct");

  const loopbackUserClientJson = runFailureStep(
    "proof verifier loopback-user-client self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--require-external-user-client-urls"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(
    loopbackUserClientJson,
    "user client external url user"
  );

  const loopbackHostJson = runFailureStep(
    "proof verifier loopback-host self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--require-external-host-url"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(loopbackHostJson, "host external url");

  const externalHostJson = runStep("proof verifier external-host self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--host-url",
    "http://host.example:7071",
    "--require-external-host-url"
  ]);
  verifySelfTestJson(externalHostJson);

  const wrongRuntimeKindJson = runFailureStep("proof verifier wrong-runtime-kind self-test", [
    "scripts/federated-distributed-proof-verify.mjs",
    "--self-test",
    "--json",
    "--self-test-wrong-runtime-kind"
  ], {
    mustContain: '"ok": false'
  });
  verifySelfTestFailureJson(wrongRuntimeKindJson, "supports agent_runner");

  const wrongAgentEngineKindJson = runFailureStep(
    "proof verifier wrong-agent-engine-kind self-test",
    [
      "scripts/federated-distributed-proof-verify.mjs",
      "--self-test",
      "--json",
      "--self-test-wrong-agent-engine-kind"
    ],
    {
      mustContain: '"ok": false'
    }
  );
  verifySelfTestFailureJson(wrongAgentEngineKindJson, "supports opencode_server");

  console.log("\nDistributed proof tool smoke passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

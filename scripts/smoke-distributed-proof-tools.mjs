#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
      "--check-relay-health",
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
      '"gitServiceRefs":["gitea"]'
    ]
  });

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
        checkRelayHealth: true,
        gitServiceRefs: ["gitea"],
        hostUrl: "http://host.example:7071",
        relayUrls: ["ws://relay.example:7777"],
        requireArtifactEvidence: true,
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

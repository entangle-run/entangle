import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  AgentEngineTurnResult,
  ArtifactRef,
  ArtifactRecord,
  EngineArtifactInput,
  EffectiveRuntimeContext,
  EntangleA2AMessage
} from "@entangle/types";
import {
  artifactRecordSchema,
  resolveGitPrincipalBindingForService,
  resolveGitRepositoryTargetForArtifactLocator
} from "@entangle/types";
import { validateRuntimeArtifactRefs } from "@entangle/validator";

type ArtifactMaterializationInput = {
  context: EffectiveRuntimeContext;
  envelope: {
    eventId: string;
    message: EntangleA2AMessage;
  };
  result: AgentEngineTurnResult;
  turnId: string;
};

type ArtifactMaterializationResult = {
  artifacts: ArtifactRecord[];
};

type ArtifactRetrievalInput = {
  artifactRefs: ArtifactRef[];
  context: EffectiveRuntimeContext;
};

type ArtifactRetrievalResult = {
  artifactInputs: EngineArtifactInput[];
  artifacts: ArtifactRecord[];
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function sanitizeBranchComponent(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return sanitized || "work";
}

function buildBranchName(input: {
  intent: string;
  nodeId: string;
  sessionId: string;
}): string {
  const scope = sanitizeBranchComponent(input.intent).slice(0, 48);
  return `${input.nodeId}/${input.sessionId}/${scope}`;
}

function buildReportRelativePath(input: {
  sessionId: string;
  turnId: string;
}): string {
  return path.join("reports", input.sessionId, `${input.turnId}.md`);
}

function buildCommitMessage(input: {
  intent: string;
  nodeId: string;
  turnId: string;
}): string {
  const scope = sanitizeBranchComponent(input.intent).slice(0, 48);
  return `entangle(${input.nodeId}): ${scope} ${input.turnId}`;
}

function buildReportContent(input: {
  context: EffectiveRuntimeContext;
  envelope: ArtifactMaterializationInput["envelope"];
  reportRelativePath: string;
  result: AgentEngineTurnResult;
  turnId: string;
}): string {
  const assistantSummary =
    input.result.assistantMessages.join("\n\n").trim() ||
    "The runner completed the turn without producing assistant output.";
  const inboundArtifacts =
    input.envelope.message.work.artifactRefs.length > 0
      ? input.envelope.message.work.artifactRefs
          .map((artifactRef) => `- ${artifactRef.artifactId} (${artifactRef.backend})`)
          .join("\n")
      : "- none";

  return [
    `# Entangle Turn Report`,
    ``,
    `- node_id: ${input.context.binding.node.nodeId}`,
    `- session_id: ${input.envelope.message.sessionId}`,
    `- conversation_id: ${input.envelope.message.conversationId}`,
    `- turn_id: ${input.turnId}`,
    `- message_id: ${input.envelope.eventId}`,
    `- intent: ${input.envelope.message.intent}`,
    `- stop_reason: ${input.result.stopReason}`,
    `- branch: ${buildBranchName({
      intent: input.envelope.message.intent,
      nodeId: input.context.binding.node.nodeId,
      sessionId: input.envelope.message.sessionId
    })}`,
    `- report_path: ${input.reportRelativePath}`,
    ``,
    `## Inbound Summary`,
    ``,
    input.envelope.message.work.summary,
    ``,
    `## Inbound Artifact Refs`,
    ``,
    inboundArtifacts,
    ``,
    `## Assistant Output`,
    ``,
    assistantSummary,
    ``
  ].join("\n");
}

function resolvePrimaryGitAttribution(context: EffectiveRuntimeContext): {
  email: string;
  name: string;
} {
  const primaryBinding =
    context.artifactContext.primaryGitPrincipalRef
      ? context.artifactContext.gitPrincipalBindings.find(
          (binding) =>
            binding.principal.principalId ===
            context.artifactContext.primaryGitPrincipalRef
        )
      : undefined;
  const attribution = primaryBinding?.principal.attribution;

  return {
    email:
      attribution?.email ?? `${context.binding.node.nodeId}@entangle.invalid`,
    name: attribution?.displayName ?? context.binding.node.displayName
  };
}

async function runGitCommand(
  repoPath: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv | undefined;
  } = {}
): Promise<string> {
  await mkdir(repoPath, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repoPath,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `Git command failed (${args.join(" ")}): ${stderr.trim() || stdout.trim()}`
        )
      );
    });
  });
}

async function ensureGitWorkspace(input: {
  branchName: string;
  context: EffectiveRuntimeContext;
  repoPath: string;
}): Promise<void> {
  const gitDirectoryPath = path.join(input.repoPath, ".git");
  const repoExists = await pathExists(gitDirectoryPath);

  if (!repoExists) {
    await runGitCommand(input.repoPath, [
      "init",
      `--initial-branch=${input.branchName}`
    ]);
  } else {
    await runGitCommand(input.repoPath, ["checkout", "-B", input.branchName]);
  }

  const attribution = resolvePrimaryGitAttribution(input.context);

  await runGitCommand(input.repoPath, [
    "config",
    "user.name",
    attribution.name
  ]);
  await runGitCommand(input.repoPath, [
    "config",
    "user.email",
    attribution.email
  ]);
}

function buildGitRemoteName(gitServiceRef: string): string {
  return `entangle-${sanitizeBranchComponent(gitServiceRef)}`;
}

async function readDeliveredSecretValue(input: {
  principalId: string;
  secretPurpose: string;
  transport: EffectiveRuntimeContext["artifactContext"]["gitPrincipalBindings"][number]["transport"];
}): Promise<string> {
  if (input.transport.status !== "available" || !input.transport.delivery) {
    throw new Error(
      `Remote git operations require an available ${input.secretPurpose} secret for git principal '${input.principalId}'.`
    );
  }

  const secretValue =
    input.transport.delivery.mode === "mounted_file"
      ? await readFile(input.transport.delivery.filePath, "utf8")
      : process.env[input.transport.delivery.envVar];
  const normalizedSecretValue = secretValue?.trim();

  if (!normalizedSecretValue) {
    throw new Error(
      `Remote git operations require non-empty ${input.secretPurpose} secret material for git principal '${input.principalId}'.`
    );
  }

  return normalizedSecretValue;
}

async function ensureGitHttpsAskPassScript(
  context: EffectiveRuntimeContext
): Promise<string> {
  const askPassScriptPath = path.join(
    context.workspace.runtimeRoot,
    "git-https-askpass.sh"
  );
  const askPassScript = [
    "#!/bin/sh",
    "case \"$1\" in",
    "  *Username*) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_USERNAME\" ;;",
    "  *Password*) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_TOKEN\" ;;",
    "  *) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_TOKEN\" ;;",
    "esac",
    ""
  ].join("\n");

  await mkdir(path.dirname(askPassScriptPath), { recursive: true });
  await writeFile(askPassScriptPath, askPassScript, {
    encoding: "utf8",
    mode: 0o700
  });
  await chmod(askPassScriptPath, 0o700);

  return askPassScriptPath;
}

export async function buildGitCommandEnvForRemoteOperation(input: {
  context: EffectiveRuntimeContext;
  target: {
    gitServiceRef: string;
    remoteUrl: string;
    transportKind: "file" | "https" | "ssh";
  };
}): Promise<NodeJS.ProcessEnv | undefined> {
  // Bounded test profiles may target a directly mounted bare repository path.
  // Those remotes do not require transport-level credentials.
  if (!input.target.remoteUrl.includes("://")) {
    return undefined;
  }

  if (input.target.transportKind === "file") {
    return undefined;
  }

  const principalResolution = resolveGitPrincipalBindingForService({
    artifactContext: input.context.artifactContext,
    gitServiceRef: input.target.gitServiceRef
  });

  if (principalResolution.status === "missing") {
    throw new Error(
      `Remote git operations require a git principal binding for service '${input.target.gitServiceRef}', but none was resolved.`
    );
  }

  if (principalResolution.status === "ambiguous") {
    throw new Error(
      `Remote git operations require a deterministic git principal for service '${input.target.gitServiceRef}', but multiple candidates were resolved: ${principalResolution.candidatePrincipalIds.join(", ")}.`
    );
  }

  const principalBinding = principalResolution.binding;

  if (input.target.transportKind === "ssh") {
    if (principalBinding.principal.transportAuthMode !== "ssh_key") {
      throw new Error(
        `Remote git SSH operations require an SSH-key git principal, but '${principalBinding.principal.principalId}' uses '${principalBinding.principal.transportAuthMode}'.`
      );
    }

    if (
      principalBinding.transport.status !== "available" ||
      principalBinding.transport.delivery?.mode !== "mounted_file"
    ) {
      throw new Error(
        `Remote git SSH operations require an available mounted SSH key for git principal '${principalBinding.principal.principalId}'.`
      );
    }

    return {
      GIT_SSH_COMMAND: [
        "ssh",
        "-F",
        "/dev/null",
        "-i",
        principalBinding.transport.delivery.filePath,
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        "StrictHostKeyChecking=accept-new"
      ].join(" ")
    };
  }

  if (principalBinding.principal.transportAuthMode !== "https_token") {
    throw new Error(
      `Remote git HTTPS operations require an HTTPS-token git principal, but '${principalBinding.principal.principalId}' uses '${principalBinding.principal.transportAuthMode}'.`
    );
  }

  const token = await readDeliveredSecretValue({
    principalId: principalBinding.principal.principalId,
    secretPurpose: "HTTPS token",
    transport: principalBinding.transport
  });
  const askPassScriptPath = await ensureGitHttpsAskPassScript(input.context);

  return {
    ENTANGLE_GIT_ASKPASS_TOKEN: token,
    ENTANGLE_GIT_ASKPASS_USERNAME: principalBinding.principal.subject,
    GIT_ASKPASS: askPassScriptPath,
    GIT_TERMINAL_PROMPT: "0"
  };
}

function buildArtifactRetrievalRoot(input: {
  artifactId: string;
  context: EffectiveRuntimeContext;
  target: {
    gitServiceRef: string;
    namespace: string;
    repositoryName: string;
  };
}): string {
  return path.join(
    input.context.workspace.retrievalRoot,
    sanitizeBranchComponent(input.target.gitServiceRef),
    sanitizeBranchComponent(input.target.namespace),
    sanitizeBranchComponent(input.target.repositoryName),
    sanitizeBranchComponent(input.artifactId)
  );
}

function buildArtifactRetrievalFailureRecord(input: {
  artifactRef: ArtifactRef;
  error: unknown;
  remoteName?: string | undefined;
  remoteUrl?: string | undefined;
}): ArtifactRecord {
  const timestamp = nowIsoString();
  const lastError =
    input.error instanceof Error && input.error.message.trim().length > 0
      ? input.error.message
      : "Unknown artifact retrieval failure.";

  return artifactRecordSchema.parse({
    createdAt: timestamp,
    ref: input.artifactRef,
    retrieval: {
      lastAttemptAt: timestamp,
      lastError,
      remoteName: input.remoteName,
      remoteUrl: input.remoteUrl,
      state: "failed"
    },
    updatedAt: timestamp
  });
}

export class RunnerArtifactRetrievalError extends Error {
  readonly artifactRecords: ArtifactRecord[];

  constructor(input: {
    artifactRecords: ArtifactRecord[];
    message: string;
  }) {
    super(input.message);
    this.artifactRecords = input.artifactRecords;
    this.name = "RunnerArtifactRetrievalError";
  }
}

async function ensureGitRemote(input: {
  env?: NodeJS.ProcessEnv | undefined;
  remoteName: string;
  remoteUrl: string;
  repoPath: string;
}): Promise<void> {
  let currentRemoteUrl: string | undefined;

  try {
    currentRemoteUrl = await runGitCommand(
      input.repoPath,
      ["remote", "get-url", input.remoteName],
      {
        env: input.env
      }
    );
  } catch {
    currentRemoteUrl = undefined;
  }

  if (!currentRemoteUrl) {
    await runGitCommand(
      input.repoPath,
      ["remote", "add", input.remoteName, input.remoteUrl],
      {
        env: input.env
      }
    );
    return;
  }

  if (currentRemoteUrl !== input.remoteUrl) {
    await runGitCommand(
      input.repoPath,
      ["remote", "set-url", input.remoteName, input.remoteUrl],
      {
        env: input.env
      }
    );
  }
}

async function publishGitArtifactRecord(input: {
  artifactRecord: ArtifactRecord;
  branchName: string;
  context: EffectiveRuntimeContext;
  repoPath: string;
}): Promise<ArtifactRecord> {
  const target = input.context.artifactContext.primaryGitRepositoryTarget;

  if (!target) {
    return input.artifactRecord;
  }

  const remoteName = buildGitRemoteName(target.gitServiceRef);
  const attemptTimestamp = nowIsoString();

  try {
    const gitEnv = await buildGitCommandEnvForRemoteOperation({
      context: input.context,
      target
    });
    await ensureGitRemote({
      env: gitEnv,
      remoteName,
      remoteUrl: target.remoteUrl,
      repoPath: input.repoPath
    });
    await runGitCommand(
      input.repoPath,
      ["push", "--set-upstream", remoteName, `HEAD:refs/heads/${input.branchName}`],
      {
        env: gitEnv
      }
    );

    return artifactRecordSchema.parse({
      ...input.artifactRecord,
      publication: {
        publishedAt: attemptTimestamp,
        remoteName,
        remoteUrl: target.remoteUrl,
        state: "published"
      },
      ref: {
        ...input.artifactRecord.ref,
        status: "published"
      },
      updatedAt: attemptTimestamp
    });
  } catch (error) {
    const publicationError =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unknown remote git publication failure.";

    return artifactRecordSchema.parse({
      ...input.artifactRecord,
      publication: {
        lastAttemptAt: attemptTimestamp,
        lastError: publicationError,
        remoteName,
        remoteUrl: target.remoteUrl,
        state: "failed"
      },
      updatedAt: attemptTimestamp
    });
  }
}

async function retrieveGitArtifact(input: {
  artifactRef: Extract<ArtifactRef, { backend: "git" }>;
  context: EffectiveRuntimeContext;
}): Promise<{
  artifactInput: EngineArtifactInput;
  artifactRecord: ArtifactRecord;
}> {
  const validation = validateRuntimeArtifactRefs({
    artifactRefs: [input.artifactRef],
    context: input.context
  });
  const target = resolveGitRepositoryTargetForArtifactLocator({
    artifactContext: input.context.artifactContext,
    locator: input.artifactRef.locator
  });
  const remoteName = target ? buildGitRemoteName(target.gitServiceRef) : undefined;
  const remoteUrl = target?.remoteUrl;

  if (!validation.ok || !target || !remoteName || !remoteUrl) {
    const failedRecord = buildArtifactRetrievalFailureRecord({
      artifactRef: input.artifactRef,
      error: new Error(
        validation.findings.map((finding) => finding.message).join(" ")
      ),
      remoteName,
      remoteUrl
    });
    throw new RunnerArtifactRetrievalError({
      artifactRecords: [failedRecord],
      message:
        failedRecord.retrieval?.lastError ??
        "Git artifact retrieval validation failed."
    });
  }

  const retrievalRoot = buildArtifactRetrievalRoot({
    artifactId: input.artifactRef.artifactId,
    context: input.context,
    target
  });
  const repoPath = path.join(retrievalRoot, "repo");
  const localPath = path.join(repoPath, input.artifactRef.locator.path);
  const gitDirectoryPath = path.join(repoPath, ".git");
  const gitEnv = await buildGitCommandEnvForRemoteOperation({
    context: input.context,
    target
  });

  try {
    if (!(await pathExists(gitDirectoryPath))) {
      await mkdir(retrievalRoot, { recursive: true });
      await runGitCommand(
        retrievalRoot,
        ["clone", "--origin", remoteName, "--no-checkout", remoteUrl, "repo"],
        {
          env: gitEnv
        }
      );
    } else {
      await ensureGitRemote({
        env: gitEnv,
        remoteName,
        remoteUrl,
        repoPath
      });
    }

    await runGitCommand(repoPath, ["fetch", "--prune", remoteName], {
      env: gitEnv
    });
    await runGitCommand(repoPath, ["checkout", "--force", input.artifactRef.locator.commit], {
      env: gitEnv
    });

    if (!(await pathExists(localPath))) {
      throw new Error(
        `Retrieved git artifact '${input.artifactRef.artifactId}' does not contain expected path '${input.artifactRef.locator.path}'.`
      );
    }

    const timestamp = nowIsoString();
    const artifactRecord = artifactRecordSchema.parse({
      createdAt: timestamp,
      materialization: {
        localPath,
        repoPath
      },
      ref: input.artifactRef,
      retrieval: {
        retrievedAt: timestamp,
        remoteName,
        remoteUrl,
        state: "retrieved"
      },
      updatedAt: timestamp
    });

    return {
      artifactInput: {
        artifactId: input.artifactRef.artifactId,
        backend: input.artifactRef.backend,
        localPath,
        repoPath,
        sourceRef: input.artifactRef
      },
      artifactRecord
    };
  } catch (error) {
    const failedRecord = buildArtifactRetrievalFailureRecord({
      artifactRef: input.artifactRef,
      error,
      remoteName,
      remoteUrl
    });
    throw new RunnerArtifactRetrievalError({
      artifactRecords: [failedRecord],
      message:
        failedRecord.retrieval?.lastError ??
        "Git artifact retrieval failed."
    });
  }
}

async function resolveInboundArtifacts(
  input: ArtifactRetrievalInput
): Promise<ArtifactRetrievalResult> {
  const artifactInputs: EngineArtifactInput[] = [];
  const artifacts: ArtifactRecord[] = [];

  for (const artifactRef of input.artifactRefs) {
    if (artifactRef.backend !== "git") {
      continue;
    }

    const resolved = await retrieveGitArtifact({
      artifactRef,
      context: input.context
    });
    artifactInputs.push(resolved.artifactInput);
    artifacts.push(resolved.artifactRecord);
  }

  return {
    artifactInputs,
    artifacts
  };
}

async function createGitReportArtifact(
  input: ArtifactMaterializationInput
): Promise<ArtifactRecord> {
  const repoPath = input.context.workspace.artifactWorkspaceRoot;
  const branchName = buildBranchName({
    intent: input.envelope.message.intent,
    nodeId: input.context.binding.node.nodeId,
    sessionId: input.envelope.message.sessionId
  });
  await ensureGitWorkspace({
    branchName,
    context: input.context,
    repoPath
  });

  const reportRelativePath = buildReportRelativePath({
    sessionId: input.envelope.message.sessionId,
    turnId: input.turnId
  });
  const reportAbsolutePath = path.join(repoPath, reportRelativePath);
  await mkdir(path.dirname(reportAbsolutePath), { recursive: true });
  await writeFile(
    reportAbsolutePath,
    buildReportContent({
      context: input.context,
      envelope: input.envelope,
      reportRelativePath,
      result: input.result,
      turnId: input.turnId
    }),
    "utf8"
  );

  await runGitCommand(repoPath, ["add", "--", reportRelativePath]);
  await runGitCommand(repoPath, [
    "commit",
    "-m",
    buildCommitMessage({
      intent: input.envelope.message.intent,
      nodeId: input.context.binding.node.nodeId,
      turnId: input.turnId
    })
  ]);
  const commit = await runGitCommand(repoPath, ["rev-parse", "HEAD"]);
  const timestamp = nowIsoString();
  const artifactRecord = artifactRecordSchema.parse({
    createdAt: timestamp,
    materialization: {
      localPath: reportAbsolutePath,
      repoPath
    },
    publication: {
      state: "not_requested"
    },
    ref: {
      artifactId: `report-${input.turnId}`,
      artifactKind: "report_file",
      backend: "git",
      contentSummary:
        input.result.assistantMessages.join("\n").trim() ||
        `Turn report for ${input.context.binding.node.nodeId}.`,
      conversationId: input.envelope.message.conversationId,
      createdByNodeId: input.context.binding.node.nodeId,
      locator: {
        branch: branchName,
        commit,
        gitServiceRef: input.context.artifactContext.primaryGitServiceRef,
        namespace: input.context.artifactContext.defaultNamespace,
        repositoryName:
          input.context.artifactContext.primaryGitRepositoryTarget?.repositoryName,
        path: reportRelativePath
      },
      preferred: true,
      sessionId: input.envelope.message.sessionId,
      status: "materialized"
    },
    turnId: input.turnId,
    updatedAt: timestamp
  });

  return publishGitArtifactRecord({
    artifactRecord,
    branchName,
    context: input.context,
    repoPath
  });
}

export interface RunnerArtifactBackend {
  retrieveInboundArtifacts(
    input: ArtifactRetrievalInput
  ): Promise<ArtifactRetrievalResult>;
  materializeTurnArtifacts(
    input: ArtifactMaterializationInput
  ): Promise<ArtifactMaterializationResult>;
}

export class GitCliRunnerArtifactBackend implements RunnerArtifactBackend {
  retrieveInboundArtifacts(
    input: ArtifactRetrievalInput
  ): Promise<ArtifactRetrievalResult> {
    return resolveInboundArtifacts(input);
  }

  async materializeTurnArtifacts(
    input: ArtifactMaterializationInput
  ): Promise<ArtifactMaterializationResult> {
    const artifact = await createGitReportArtifact(input);

    return {
      artifacts: [artifact]
    };
  }
}

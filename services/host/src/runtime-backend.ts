import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type {
  EffectiveRuntimeContext,
  RuntimeBackendKind,
  RuntimeDesiredState,
  RuntimeObservedState
} from "@entangle/types";

const execFile = promisify(execFileCallback);

type RuntimeMountStrategy =
  | {
      kind: "bind";
      source: string;
      target: string;
    }
  | {
      kind: "volume";
      source: string;
      target: string;
    };

type RuntimeBackendObservation = {
  backendKind: RuntimeBackendKind;
  lastError: string | undefined;
  observedState: RuntimeObservedState;
  runtimeHandle: string | undefined;
  statusMessage: string | undefined;
};

export type RuntimeBackendReconcileInput = {
  context: EffectiveRuntimeContext | undefined;
  contextPath: string | undefined;
  desiredState: RuntimeDesiredState;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  reason: string | undefined;
};

export interface RuntimeBackend {
  readonly kind: RuntimeBackendKind;
  reconcileRuntime(
    input: RuntimeBackendReconcileInput
  ): Promise<RuntimeBackendObservation>;
  removeInactiveRuntime(nodeId: string): Promise<void>;
}

type DockerContainerInspect = {
  Config: {
    Env: string[];
    Image: string;
    Labels: Record<string, string>;
  };
  Id: string;
  Name: string;
  State: {
    ExitCode: number;
    OOMKilled: boolean;
    Running: boolean;
    StartedAt: string;
    Status: string;
  };
};

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : "entangle-node";
}

function buildContainerName(nodeId: string): string {
  return sanitizeIdentifier(`entangle-runner-${nodeId}`);
}

function mapContainerStateToObservedState(
  inspect: DockerContainerInspect
): RuntimeObservedState {
  if (inspect.State.Running) {
    return "running";
  }

  if (inspect.State.Status === "created" || inspect.State.Status === "restarting") {
    return "starting";
  }

  if (inspect.State.Status === "exited") {
    return inspect.State.ExitCode === 0 ? "stopped" : "failed";
  }

  if (inspect.State.Status === "dead") {
    return "failed";
  }

  return "missing";
}

function buildDockerMountStrategy(hostStateRoot: string): RuntimeMountStrategy {
  const configuredVolume = process.env.ENTANGLE_DOCKER_SHARED_STATE_VOLUME?.trim();
  const hostStateMountRoot = configuredVolume
    ? path.resolve(
        process.env.ENTANGLE_DOCKER_SHARED_STATE_TARGET?.trim() || "/entangle-state"
      )
    : path.resolve(path.dirname(hostStateRoot));

  if (configuredVolume) {
    return {
      kind: "volume",
      source: configuredVolume,
      target: hostStateMountRoot
    };
  }

  return {
    kind: "bind",
    source: path.resolve(path.dirname(hostStateRoot)),
    target: path.resolve(path.dirname(hostStateRoot))
  };
}

class MemoryRuntimeBackend implements RuntimeBackend {
  readonly kind = "memory" as const;

  reconcileRuntime(
    input: RuntimeBackendReconcileInput
  ): Promise<RuntimeBackendObservation> {
    if (input.desiredState === "running" && input.context) {
      return Promise.resolve({
        backendKind: this.kind,
        lastError: undefined,
        observedState: "running",
        runtimeHandle: `memory:${input.nodeId}`,
        statusMessage: "Runtime converged in the in-memory backend."
      });
    }

    return Promise.resolve({
      backendKind: this.kind,
      lastError: undefined,
      observedState: "stopped",
      runtimeHandle: undefined,
      statusMessage:
        input.reason ?? "Runtime is not scheduled to run in the in-memory backend."
    });
  }

  removeInactiveRuntime(nodeId: string): Promise<void> {
    void nodeId;
    return Promise.resolve();
  }
}

class DockerRuntimeBackend implements RuntimeBackend {
  readonly kind = "docker" as const;
  private readonly networkName = process.env.ENTANGLE_DOCKER_NETWORK?.trim();
  private readonly runnerImage =
    process.env.ENTANGLE_DOCKER_RUNNER_IMAGE?.trim() || "entangle-runner:local";
  private readonly stateMount: RuntimeMountStrategy;

  constructor(hostStateRoot: string) {
    this.stateMount = buildDockerMountStrategy(hostStateRoot);
  }

  async reconcileRuntime(
    input: RuntimeBackendReconcileInput
  ): Promise<RuntimeBackendObservation> {
    const containerName = buildContainerName(input.nodeId);

    if (input.desiredState !== "running" || !input.context || !input.contextPath) {
      await this.removeContainerIfPresent(containerName);
      return {
        backendKind: this.kind,
        lastError: undefined,
        observedState: "stopped",
        runtimeHandle: undefined,
        statusMessage: input.reason ?? "Runtime is intentionally stopped."
      };
    }

    const imageAvailable = await this.inspectImage();

    if (!imageAvailable) {
      return {
        backendKind: this.kind,
        lastError: `Docker runner image '${this.runnerImage}' is not available.`,
        observedState: "failed",
        runtimeHandle: undefined,
        statusMessage:
          `Docker runner image '${this.runnerImage}' is not available. ` +
          "Build or pull the runner image before starting managed runtimes."
      };
    }

    let inspection = await this.inspectContainer(containerName);

    if (inspection && this.containerRequiresRecreation(inspection, input)) {
      await this.removeContainerIfPresent(containerName);
      inspection = undefined;
    }

    if (!inspection) {
      await this.createContainer(containerName, input);
      await this.startContainer(containerName);
      inspection = await this.inspectContainer(containerName);
    } else if (!inspection.State.Running) {
      await this.startContainer(containerName);
      inspection = await this.inspectContainer(containerName);
    }

    if (!inspection) {
      return {
        backendKind: this.kind,
        lastError:
          "Docker did not return runtime inspection data after attempting to start the container.",
        observedState: "failed",
        runtimeHandle: undefined,
        statusMessage:
          "Docker did not return runtime inspection data after start."
      };
    }

    return {
      backendKind: this.kind,
      lastError:
        inspection.State.ExitCode !== 0 && !inspection.State.Running
          ? `Runner container exited with code ${inspection.State.ExitCode}.`
          : undefined,
      observedState: mapContainerStateToObservedState(inspection),
      runtimeHandle: inspection.Id,
      statusMessage:
        inspection.State.Running
          ? `Runner container '${containerName}' is running.`
          : `Runner container '${containerName}' is ${inspection.State.Status}.`
    };
  }

  async removeInactiveRuntime(nodeId: string): Promise<void> {
    await this.removeContainerIfPresent(buildContainerName(nodeId));
  }

  private containerRequiresRecreation(
    inspection: DockerContainerInspect,
    input: RuntimeBackendReconcileInput
  ): boolean {
    if (!input.contextPath) {
      return false;
    }

    const labels = inspection.Config.Labels ?? {};
    const envEntries = new Set(inspection.Config.Env ?? []);

    return (
      inspection.Config.Image !== this.runnerImage ||
      labels["io.entangle.graph_revision_id"] !== input.graphRevisionId ||
      labels["io.entangle.runtime_context_path"] !== input.contextPath ||
      !envEntries.has(`ENTANGLE_RUNTIME_CONTEXT_PATH=${input.contextPath}`)
    );
  }

  private async inspectImage(): Promise<boolean> {
    try {
      await execFile("docker", ["image", "inspect", this.runnerImage], {
        maxBuffer: 4 * 1024 * 1024
      });
      return true;
    } catch {
      return false;
    }
  }

  private async inspectContainer(
    containerName: string
  ): Promise<DockerContainerInspect | undefined> {
    try {
      const { stdout } = await execFile(
        "docker",
        ["container", "inspect", containerName, "--format", "{{json .}}"],
        {
          maxBuffer: 4 * 1024 * 1024
        }
      );
      return JSON.parse(stdout) as DockerContainerInspect;
    } catch (error) {
      const stderr =
        typeof error === "object" &&
        error !== null &&
        "stderr" in error &&
        typeof error.stderr === "string"
          ? error.stderr
          : "";

      if (stderr.includes("No such container")) {
        return undefined;
      }

      throw error;
    }
  }

  private async createContainer(
    containerName: string,
    input: RuntimeBackendReconcileInput
  ): Promise<void> {
    if (!input.contextPath) {
      throw new Error("Cannot create a runner container without a runtime context path.");
    }

    const mountArg =
      this.stateMount.kind === "volume"
        ? `type=volume,src=${this.stateMount.source},dst=${this.stateMount.target}`
        : `type=bind,src=${this.stateMount.source},dst=${this.stateMount.target}`;
    const args = [
      "container",
      "create",
      "--name",
      containerName,
      "--label",
      "io.entangle.managed=true",
      "--label",
      `io.entangle.node_id=${input.nodeId}`,
      "--label",
      `io.entangle.graph_id=${input.graphId}`,
      "--label",
      `io.entangle.graph_revision_id=${input.graphRevisionId}`,
      "--label",
      `io.entangle.runtime_context_path=${input.contextPath}`,
      "--mount",
      mountArg,
      "--env",
      `ENTANGLE_RUNTIME_CONTEXT_PATH=${input.contextPath}`
    ];

    if (this.networkName) {
      args.push("--network", this.networkName);
    }

    args.push(this.runnerImage);

    await execFile("docker", args, {
      maxBuffer: 4 * 1024 * 1024
    });
  }

  private async startContainer(containerName: string): Promise<void> {
    await execFile("docker", ["container", "start", containerName], {
      maxBuffer: 4 * 1024 * 1024
    });
  }

  private async removeContainerIfPresent(containerName: string): Promise<void> {
    try {
      await execFile("docker", ["container", "rm", "--force", containerName], {
        maxBuffer: 4 * 1024 * 1024
      });
    } catch (error) {
      const stderr =
        typeof error === "object" &&
        error !== null &&
        "stderr" in error &&
        typeof error.stderr === "string"
          ? error.stderr
          : "";

      if (!stderr.includes("No such container")) {
        throw error;
      }
    }
  }
}

export function createRuntimeBackend(hostStateRoot: string): RuntimeBackend {
  return process.env.ENTANGLE_RUNTIME_BACKEND === "memory"
    ? new MemoryRuntimeBackend()
    : new DockerRuntimeBackend(hostStateRoot);
}

import path from "node:path";
import type {
  EffectiveRuntimeContext,
  RuntimeBackendKind,
  RuntimeDesiredState,
  RuntimeObservedState
} from "@entangle/types";
import type {
  DockerContainerInspect,
  DockerEngineApi
} from "./docker-engine-client.js";
import { DockerEngineClient } from "./docker-engine-client.js";

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
  secretEnvironment?: Record<string, string>;
};

export interface RuntimeBackend {
  readonly kind: RuntimeBackendKind;
  reconcileRuntime(
    input: RuntimeBackendReconcileInput
  ): Promise<RuntimeBackendObservation>;
  removeInactiveRuntime(nodeId: string): Promise<void>;
}

export type RuntimeBackendFactoryOptions = {
  dockerClient?: DockerEngineApi;
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
  private readonly dockerClient: DockerEngineApi;
  private readonly networkName = process.env.ENTANGLE_DOCKER_NETWORK?.trim();
  private readonly runnerImage =
    process.env.ENTANGLE_DOCKER_RUNNER_IMAGE?.trim() || "entangle-runner:local";
  private readonly stateMount: RuntimeMountStrategy;

  constructor(
    hostStateRoot: string,
    dockerClient: DockerEngineApi = new DockerEngineClient()
  ) {
    this.dockerClient = dockerClient;
    this.stateMount = buildDockerMountStrategy(hostStateRoot);
  }

  async reconcileRuntime(
    input: RuntimeBackendReconcileInput
  ): Promise<RuntimeBackendObservation> {
    const containerName = buildContainerName(input.nodeId);

    if (input.desiredState !== "running" || !input.context || !input.contextPath) {
      await this.dockerClient.removeContainer(containerName);
      return {
        backendKind: this.kind,
        lastError: undefined,
        observedState: "stopped",
        runtimeHandle: undefined,
        statusMessage: input.reason ?? "Runtime is intentionally stopped."
      };
    }

    const imageAvailable = await this.dockerClient.inspectImage(this.runnerImage);

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

    let inspection = await this.dockerClient.inspectContainer(containerName);

    if (inspection && this.containerRequiresRecreation(inspection, input)) {
      await this.dockerClient.removeContainer(containerName);
      inspection = undefined;
    }

    if (!inspection) {
      const containerEnv = [
        `ENTANGLE_RUNTIME_CONTEXT_PATH=${input.contextPath}`,
        ...Object.entries(input.secretEnvironment ?? {})
          .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
          .map(([key, value]) => `${key}=${value}`)
      ];
      const mounts = [
        {
          source: this.stateMount.source,
          target: this.stateMount.target,
          type: this.stateMount.kind
        }
      ] as const;
      await this.dockerClient.createContainer({
        containerName,
        env: containerEnv,
        image: this.runnerImage,
        labels: {
          "io.entangle.graph_id": input.graphId,
          "io.entangle.graph_revision_id": input.graphRevisionId,
          "io.entangle.managed": "true",
          "io.entangle.node_id": input.nodeId,
          "io.entangle.runtime_context_path": input.contextPath
        },
        mounts: [...mounts],
        networkName: this.networkName
      });
      await this.dockerClient.startContainer(containerName);
      inspection = await this.dockerClient.inspectContainer(containerName);
    } else if (!inspection.State.Running) {
      await this.dockerClient.startContainer(containerName);
      inspection = await this.dockerClient.inspectContainer(containerName);
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

  removeInactiveRuntime(nodeId: string): Promise<void> {
    return this.dockerClient.removeContainer(buildContainerName(nodeId));
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
    const requiredEnvEntries = [
      `ENTANGLE_RUNTIME_CONTEXT_PATH=${input.contextPath}`,
      ...Object.entries(input.secretEnvironment ?? {})
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
    ];

    return (
      inspection.Config.Image !== this.runnerImage ||
      labels["io.entangle.graph_revision_id"] !== input.graphRevisionId ||
      labels["io.entangle.runtime_context_path"] !== input.contextPath ||
      requiredEnvEntries.some((entry) => !envEntries.has(entry))
    );
  }
}

export function createRuntimeBackend(
  hostStateRoot: string,
  options: RuntimeBackendFactoryOptions = {}
): RuntimeBackend {
  return process.env.ENTANGLE_RUNTIME_BACKEND === "memory"
    ? new MemoryRuntimeBackend()
    : new DockerRuntimeBackend(hostStateRoot, options.dockerClient);
}

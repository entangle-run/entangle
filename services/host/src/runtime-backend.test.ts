import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { EffectiveRuntimeContext } from "@entangle/types";
import type {
  DockerContainerInspect,
  DockerCreateContainerInput,
  DockerEngineApi
} from "./docker-engine-client.js";
import { createRuntimeBackend } from "./runtime-backend.js";

function buildContainerInspection(
  input: Partial<DockerContainerInspect> = {}
): DockerContainerInspect {
  return {
    Config: {
      Env: [],
      Image: "entangle-runner:local",
      Labels: {},
      ...input.Config
    },
    Id: "container-1",
    Name: "/entangle-runner-worker-it",
    State: {
      ExitCode: 0,
      OOMKilled: false,
      Running: true,
      StartedAt: "2026-04-22T00:00:00.000Z",
      Status: "running",
      ...input.State
    }
  };
}

type MockedDockerEngineApi = DockerEngineApi & {
  createContainer: Mock<(input: DockerCreateContainerInput) => Promise<string>>;
  inspectContainer: Mock<
    (containerName: string) => Promise<DockerContainerInspect | undefined>
  >;
  inspectImage: Mock<(imageName: string) => Promise<boolean>>;
  removeContainer: Mock<(containerName: string) => Promise<void>>;
  startContainer: Mock<(containerName: string) => Promise<void>>;
};

function createFakeDockerClient(): MockedDockerEngineApi {
  return {
    createContainer: vi.fn<(input: DockerCreateContainerInput) => Promise<string>>(),
    inspectContainer: vi.fn<
      (containerName: string) => Promise<DockerContainerInspect | undefined>
    >(),
    inspectImage: vi.fn<(imageName: string) => Promise<boolean>>(),
    removeContainer: vi.fn<(containerName: string) => Promise<void>>(),
    startContainer: vi.fn<(containerName: string) => Promise<void>>()
  };
}

function buildRuntimeContext(): EffectiveRuntimeContext {
  return {} as EffectiveRuntimeContext;
}

describe("createRuntimeBackend", () => {
  beforeEach(() => {
    delete process.env.ENTANGLE_RUNTIME_BACKEND;
    delete process.env.ENTANGLE_DOCKER_RUNNER_IMAGE;
    delete process.env.ENTANGLE_DOCKER_NETWORK;
    delete process.env.ENTANGLE_DOCKER_SHARED_STATE_TARGET;
    delete process.env.ENTANGLE_DOCKER_SHARED_STATE_VOLUME;
  });

  it("converges a missing container into a running runtime through the injected Docker client", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";
    process.env.ENTANGLE_DOCKER_SHARED_STATE_VOLUME = "entangle-host-state";
    process.env.ENTANGLE_DOCKER_SHARED_STATE_TARGET = "/entangle-state";
    process.env.ENTANGLE_DOCKER_NETWORK = "entangle-local";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/context.json"],
            Image: "entangle-runner:local",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.runtime_context_path": "/entangle-state/context.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend("/repo/.entangle/host", {
      dockerClient
    });
    const result = await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: undefined
    });

    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
    expect(dockerClient.createContainer.mock.calls[0]?.[0]).toMatchObject({
      containerName: "entangle-runner-worker-it",
      image: "entangle-runner:local",
      mounts: [
        {
          source: "entangle-host-state",
          target: "/entangle-state",
          type: "volume"
        }
      ],
      networkName: "entangle-local"
    });
    expect(dockerClient.startContainer).toHaveBeenCalledWith(
      "entangle-runner-worker-it"
    );
    expect(result).toMatchObject({
      backendKind: "docker",
      observedState: "running"
    });
  });

  it("stops runtimes by removing the managed container", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";

    const dockerClient = createFakeDockerClient();
    const backend = createRuntimeBackend("/repo/.entangle/host", {
      dockerClient
    });
    const result = await backend.reconcileRuntime({
      context: undefined,
      contextPath: undefined,
      desiredState: "stopped",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: "Operator requested stop."
    });

    expect(dockerClient.removeContainer).toHaveBeenCalledWith(
      "entangle-runner-worker-it"
    );
    expect(result).toMatchObject({
      backendKind: "docker",
      observedState: "stopped",
      statusMessage: "Operator requested stop."
    });
  });

  it("recreates stale containers when the injected runtime context changed", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/old.json"],
            Image: "entangle-runner:local",
            Labels: {
              "io.entangle.graph_revision_id": "rev-0",
              "io.entangle.runtime_context_path": "/entangle-state/old.json"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/new.json"],
            Image: "entangle-runner:local",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.runtime_context_path": "/entangle-state/new.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend("/repo/.entangle/host", {
      dockerClient
    });
    await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/new.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: undefined
    });

    expect(dockerClient.removeContainer).toHaveBeenCalledWith(
      "entangle-runner-worker-it"
    );
    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
  });
});

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
      Image: "entangle-runner:federated-dev",
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

function buildRuntimeContext(
  input: { nodeKind?: "user" | "worker" } = {}
): EffectiveRuntimeContext {
  return {
    binding: {
      node: {
        nodeKind: input.nodeKind ?? "worker"
      }
    }
  } as EffectiveRuntimeContext;
}

describe("createRuntimeBackend", () => {
  beforeEach(() => {
    delete process.env.ENTANGLE_RUNTIME_BACKEND;
    delete process.env.ENTANGLE_DOCKER_RUNNER_IMAGE;
    delete process.env.ENTANGLE_DOCKER_RUNNER_BOOTSTRAP;
    delete process.env.ENTANGLE_DOCKER_NETWORK;
    delete process.env.ENTANGLE_DOCKER_SECRET_STATE_TARGET;
    delete process.env.ENTANGLE_DOCKER_SECRET_STATE_VOLUME;
    delete process.env.ENTANGLE_DOCKER_SHARED_STATE_TARGET;
    delete process.env.ENTANGLE_DOCKER_SHARED_STATE_VOLUME;
    delete process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_BIND_HOST;
    delete process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_BASE;
    delete process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_RANGE;
    delete process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PUBLIC_HOST;
  });

  it("converges a missing container into a running runtime through the injected Docker client", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";
    process.env.ENTANGLE_DOCKER_SHARED_STATE_VOLUME = "entangle-host-state";
    process.env.ENTANGLE_DOCKER_SHARED_STATE_TARGET = "/entangle-state";
    process.env.ENTANGLE_DOCKER_SECRET_STATE_VOLUME = "entangle-secret-state";
    process.env.ENTANGLE_DOCKER_SECRET_STATE_TARGET = "/entangle-secrets";
    process.env.ENTANGLE_DOCKER_NETWORK = "entangle";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/context.json"],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.restart_generation": "0",
              "io.entangle.runtime_context_path": "/entangle-state/context.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    const result = await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: undefined,
      restartGeneration: 0,
      secretEnvironment: {
        ENTANGLE_NOSTR_SECRET_KEY:
          "1111111111111111111111111111111111111111111111111111111111111111"
      }
    });

    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
    const createContainerInput = dockerClient.createContainer.mock.calls[0]?.[0];

    expect(createContainerInput).toBeDefined();
    expect(createContainerInput).toMatchObject({
      containerName: "entangle-runner-worker-it",
      image: "entangle-runner:federated-dev",
      mounts: [
        {
          source: "entangle-host-state",
          target: "/entangle-state",
          type: "volume"
        },
        {
          readOnly: true,
          source: "entangle-secret-state",
          target: "/entangle-secrets",
          type: "volume"
        }
      ],
      networkName: "entangle"
    });
    expect(createContainerInput?.env).toEqual(
      expect.arrayContaining([
        "ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/context.json",
        "ENTANGLE_NOSTR_SECRET_KEY=1111111111111111111111111111111111111111111111111111111111111111"
      ])
    );
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
    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    const result = await backend.reconcileRuntime({
      context: undefined,
      contextPath: undefined,
      desiredState: "stopped",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: "Operator requested stop.",
      restartGeneration: 0
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

  it("can launch a Docker runner in generic join bootstrap mode", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";
    process.env.ENTANGLE_DOCKER_RUNNER_BOOTSTRAP = "join";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: [
              "ENTANGLE_RUNNER_JOIN_CONFIG_PATH=/entangle-state/runner-join.json"
            ],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.restart_generation": "0",
              "io.entangle.runner_bootstrap": "join",
              "io.entangle.runner_join_config_path":
                "/entangle-state/runner-join.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    const result = await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/effective-runtime-context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      joinConfigPath: "/entangle-state/runner-join.json",
      nodeId: "worker-it",
      reason: undefined,
      restartGeneration: 0,
      secretEnvironment: {
        ENTANGLE_NOSTR_SECRET_KEY:
          "1111111111111111111111111111111111111111111111111111111111111111"
      }
    });

    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
    const createContainerInput = dockerClient.createContainer.mock.calls[0]?.[0];

    expect(createContainerInput?.env).toEqual(
      expect.arrayContaining([
        "ENTANGLE_RUNNER_JOIN_CONFIG_PATH=/entangle-state/runner-join.json",
        "ENTANGLE_NOSTR_SECRET_KEY=1111111111111111111111111111111111111111111111111111111111111111"
      ])
    );
    expect(createContainerInput?.env).not.toContain(
      "ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/effective-runtime-context.json"
    );
    expect(createContainerInput?.labels).toMatchObject({
      "io.entangle.runner_bootstrap": "join",
      "io.entangle.runner_join_config_path": "/entangle-state/runner-join.json"
    });
    expect(result).toMatchObject({
      backendKind: "docker",
      observedState: "running"
    });
  });

  it("publishes a reachable User Client port for Docker-backed User Node runtimes", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";
    process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_BIND_HOST = "127.0.0.1";
    process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_BASE = "42000";
    process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_RANGE = "1";
    process.env.ENTANGLE_DOCKER_HUMAN_INTERFACE_PUBLIC_HOST = "localhost";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: [
              "ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/user-context.json",
              "ENTANGLE_HUMAN_INTERFACE_HOST=0.0.0.0",
              "ENTANGLE_HUMAN_INTERFACE_PORT=42000",
              "ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL=http://localhost:42000/"
            ],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.human_interface.port": "42000",
              "io.entangle.human_interface.public_url": "http://localhost:42000/",
              "io.entangle.restart_generation": "0",
              "io.entangle.runtime_context_path":
                "/entangle-state/user-context.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    const result = await backend.reconcileRuntime({
      context: buildRuntimeContext({ nodeKind: "user" }),
      contextPath: "/entangle-state/user-context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "human-reviewer",
      reason: undefined,
      restartGeneration: 0
    });

    const createContainerInput = dockerClient.createContainer.mock.calls[0]?.[0];

    expect(createContainerInput?.env).toEqual(
      expect.arrayContaining([
        "ENTANGLE_HUMAN_INTERFACE_HOST=0.0.0.0",
        "ENTANGLE_HUMAN_INTERFACE_PORT=42000",
        "ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL=http://localhost:42000/"
      ])
    );
    expect(createContainerInput?.labels).toMatchObject({
      "io.entangle.human_interface.port": "42000",
      "io.entangle.human_interface.public_url": "http://localhost:42000/"
    });
    expect(createContainerInput?.ports).toEqual([
      {
        containerPort: 42000,
        hostIp: "127.0.0.1",
        hostPort: 42000,
        protocol: "tcp"
      }
    ]);
    expect(result).toMatchObject({
      backendKind: "docker",
      observedState: "running"
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
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-0",
              "io.entangle.restart_generation": "0",
              "io.entangle.runtime_context_path": "/entangle-state/old.json"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/new.json"],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.restart_generation": "0",
              "io.entangle.runtime_context_path": "/entangle-state/new.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/new.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: undefined,
      restartGeneration: 0,
      secretEnvironment: {
        ENTANGLE_NOSTR_SECRET_KEY:
          "2222222222222222222222222222222222222222222222222222222222222222"
      }
    });

    expect(dockerClient.removeContainer).toHaveBeenCalledWith(
      "entangle-runner-worker-it"
    );
    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
  });

  it("recreates stale containers when the restart generation changed even if the runtime context stayed the same", async () => {
    process.env.ENTANGLE_RUNTIME_BACKEND = "docker";

    const dockerClient = createFakeDockerClient();
    dockerClient.inspectImage.mockResolvedValue(true);
    dockerClient.inspectContainer
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/context.json"],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.restart_generation": "0",
              "io.entangle.runtime_context_path": "/entangle-state/context.json"
            }
          }
        })
      )
      .mockResolvedValueOnce(
        buildContainerInspection({
          Config: {
            Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/entangle-state/context.json"],
            Image: "entangle-runner:federated-dev",
            Labels: {
              "io.entangle.graph_revision_id": "rev-1",
              "io.entangle.restart_generation": "1",
              "io.entangle.runtime_context_path": "/entangle-state/context.json"
            }
          }
        })
      );

    const backend = createRuntimeBackend(
      "/repo/.entangle/host",
      "/repo/.entangle-secrets",
      {
        dockerClient
      }
    );
    await backend.reconcileRuntime({
      context: buildRuntimeContext(),
      contextPath: "/entangle-state/context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "rev-1",
      nodeId: "worker-it",
      reason: undefined,
      restartGeneration: 1,
      secretEnvironment: {
        ENTANGLE_NOSTR_SECRET_KEY:
          "3333333333333333333333333333333333333333333333333333333333333333"
      }
    });

    expect(dockerClient.removeContainer).toHaveBeenCalledWith(
      "entangle-runner-worker-it"
    );
    expect(dockerClient.createContainer).toHaveBeenCalledOnce();
    expect(dockerClient.createContainer.mock.calls[0]?.[0].labels).toMatchObject({
      "io.entangle.restart_generation": "1"
    });
  });
});

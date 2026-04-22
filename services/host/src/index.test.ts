import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const createdDirectories: string[] = [];

async function createTestServer() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-host-"));
  createdDirectories.push(tempRoot);
  process.env.ENTANGLE_HOME = tempRoot;

  vi.resetModules();
  const [hostModule, stateModule] = await Promise.all([
    import("./index.js"),
    import("./state.js")
  ]);

  await stateModule.initializeHostState();

  return hostModule.buildHostServer();
}

afterEach(async () => {
  delete process.env.ENTANGLE_HOME;
  vi.resetModules();

  await Promise.all(
    createdDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
});

describe("buildHostServer", () => {
  it("returns a structured 400 response for invalid package-source admission payloads", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path"
        },
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        code: "bad_request"
      });
    } finally {
      await server.close();
    }
  });

  it("preserves malformed JSON body errors as 400 instead of collapsing them into 500", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        headers: {
          "content-type": "application/json"
        },
        method: "POST",
        payload: "{",
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        code: "bad_request"
      });
    } finally {
      await server.close();
    }
  });

  it("returns a structured 404 response when the requested package source does not exist", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        method: "GET",
        url: "/v1/package-sources/missing-source"
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        code: "not_found",
        message: "Package source 'missing-source' was not found."
      });
    } finally {
      await server.close();
    }
  });
});

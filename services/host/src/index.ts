import Fastify from "fastify";
import {
  hostStatusResponseSchema,
  type HostStatusResponse
} from "@entangle/types";

function buildStatusResponse(): HostStatusResponse {
  return hostStatusResponseSchema.parse({
    service: "entangle-host",
    status: "healthy",
    graphRevisionId: "bootstrap",
    runtimeCounts: {
      desired: 0,
      observed: 0,
      running: 0
    },
    timestamp: new Date().toISOString()
  });
}

export function buildHostServer() {
  const server = Fastify({
    logger: true
  });

  server.get("/v1/host/status", async () => buildStatusResponse());

  return server;
}

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.ENTANGLE_HOST_PORT ?? "7071", 10);
  const server = buildHostServer();

  await server.listen({
    host: "0.0.0.0",
    port
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

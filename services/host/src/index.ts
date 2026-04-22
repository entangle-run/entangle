import Fastify from "fastify";
import {
  catalogInspectionResponseSchema,
  graphMutationResponseSchema,
  graphInspectionResponseSchema,
  hostStatusResponseSchema,
  packageSourceAdmissionRequestSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema
} from "@entangle/types";
import {
  admitPackageSource,
  applyCatalog,
  applyGraph,
  buildHostStatus,
  getCatalogInspection,
  getGraphInspection,
  getPackageSourceInspection,
  initializeHostState,
  listPackageSources,
  validateCatalogCandidate,
  validateGraphCandidate
} from "./state.js";

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown host error";
}

export function buildHostServer() {
  const server = Fastify({
    logger: true
  });

  server.get("/v1/host/status", async () =>
    hostStatusResponseSchema.parse(await buildHostStatus())
  );

  server.get("/v1/catalog", async () =>
    catalogInspectionResponseSchema.parse(await getCatalogInspection())
  );

  server.post("/v1/catalog/validate", async (request) =>
    catalogInspectionResponseSchema.parse(await validateCatalogCandidate(request.body))
  );

  server.put("/v1/catalog", async (request, reply) => {
    const inspection = await applyCatalog(request.body);

    if (!inspection.validation.ok) {
      reply.status(400);
    }

    return catalogInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/package-sources", async () =>
    packageSourceListResponseSchema.parse(await listPackageSources())
  );

  server.get("/v1/package-sources/:packageSourceId", async (request, reply) => {
    const params = request.params as { packageSourceId: string };
    const inspection = await getPackageSourceInspection(params.packageSourceId);

    if (!inspection) {
      reply.status(404);
      return { message: `Package source '${params.packageSourceId}' was not found.` };
    }

    return packageSourceInspectionResponseSchema.parse(inspection);
  });

  server.post("/v1/package-sources/admit", async (request, reply) => {
    const admissionRequest = packageSourceAdmissionRequestSchema.parse(request.body);
    const inspection = await admitPackageSource(admissionRequest);

    if (!inspection.validation.ok) {
      reply.status(400);
    }

    return packageSourceInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/graph", async () =>
    graphInspectionResponseSchema.parse(await getGraphInspection())
  );

  server.post("/v1/graph/validate", async (request) =>
    graphMutationResponseSchema.parse(await validateGraphCandidate(request.body))
  );

  server.put("/v1/graph", async (request, reply) => {
    const mutation = await applyGraph(request.body);

    if (!mutation.validation.ok) {
      reply.status(400);
    }

    return graphMutationResponseSchema.parse(mutation);
  });

  server.setErrorHandler((error, _request, reply) => {
    if (!reply.sent) {
      reply.status(500).send({
        message: normalizeErrorMessage(error)
      });
    }
  });

  return server;
}

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.ENTANGLE_HOST_PORT ?? "7071", 10);
  await initializeHostState();
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

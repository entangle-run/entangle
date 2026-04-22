import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import {
  catalogInspectionResponseSchema,
  graphMutationResponseSchema,
  graphInspectionResponseSchema,
  hostErrorResponseSchema,
  hostStatusResponseSchema,
  packageSourceAdmissionRequestSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema
} from "@entangle/types";
import { ZodError, type ZodType } from "zod";
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

class HostHttpError extends Error {
  readonly code: "bad_request" | "not_found" | "internal_error";
  readonly details: Record<string, unknown> | undefined;
  readonly statusCode: number;

  constructor(options: {
    code: "bad_request" | "not_found" | "internal_error";
    details?: Record<string, unknown>;
    message: string;
    statusCode: number;
  }) {
    super(options.message);
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
  }
}

function parseRequestBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new HostHttpError({
      code: "bad_request",
      details: {
        issues: parsed.error.issues
      },
      message: "Request body did not match the expected schema.",
      statusCode: 400
    });
  }

  return parsed.data;
}

function buildErrorPayload(error: HostHttpError) {
  return hostErrorResponseSchema.parse({
    code: error.code,
    ...(error.details ? { details: error.details } : {}),
    message: error.message
  });
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return typeof entrypoint === "string" && import.meta.url === pathToFileURL(entrypoint).href;
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

  server.post("/v1/catalog/validate", (request) =>
    catalogInspectionResponseSchema.parse(validateCatalogCandidate(request.body))
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
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Package source '${params.packageSourceId}' was not found.`
      });
    }

    return packageSourceInspectionResponseSchema.parse(inspection);
  });

  server.post("/v1/package-sources/admit", async (request, reply) => {
    const admissionRequest = parseRequestBody(
      packageSourceAdmissionRequestSchema,
      request.body
    );
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
      if (error instanceof HostHttpError) {
        reply.status(error.statusCode).send(buildErrorPayload(error));
        return;
      }

      if (error instanceof ZodError) {
        reply.status(500).send(
          hostErrorResponseSchema.parse({
            code: "internal_error",
            details: {
              issues: error.issues
            },
            message: "Host emitted a response that violated its declared contract."
          })
        );
        return;
      }

      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 500
          ? error.statusCode
          : 500;

      reply.status(statusCode).send(
        hostErrorResponseSchema.parse({
          code: statusCode === 404 ? "not_found" : statusCode < 500 ? "bad_request" : "internal_error",
          message: error instanceof Error ? error.message : "Unknown host error"
        })
      );
    }
  });

  return server;
}

export async function startHostServer(): Promise<ReturnType<typeof buildHostServer>> {
  const port = Number.parseInt(process.env.ENTANGLE_HOST_PORT ?? "7071", 10);
  await initializeHostState();
  const server = buildHostServer();

  await server.listen({
    host: "0.0.0.0",
    port
  });

  return server;
}

if (isDirectExecution()) {
  startHostServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

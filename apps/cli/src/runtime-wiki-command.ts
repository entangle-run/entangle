import {
  runtimeWikiUpsertPageBatchRequestSchema,
  type RuntimeWikiUpsertPageBatchRequest
} from "@entangle/types";

export function parseRuntimeWikiUpsertPageBatchManifest(
  content: string
): RuntimeWikiUpsertPageBatchRequest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Runtime wiki batch manifest must be valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }

  return runtimeWikiUpsertPageBatchRequestSchema.parse(parsed);
}

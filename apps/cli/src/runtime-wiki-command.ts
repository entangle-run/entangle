import {
  runtimeWikiPatchSetRequestSchema,
  runtimeWikiUpsertPageBatchRequestSchema,
  type RuntimeWikiPatchSetRequest,
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

export function parseRuntimeWikiPatchSetManifest(
  content: string
): RuntimeWikiPatchSetRequest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Runtime wiki patch-set manifest must be valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }

  return runtimeWikiPatchSetRequestSchema.parse(parsed);
}

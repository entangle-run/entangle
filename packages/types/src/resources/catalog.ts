import { z } from "zod";
import {
  httpUrlSchema,
  identifierSchema,
  nonEmptyStringSchema,
  secretRefSchema,
  websocketUrlSchema
} from "../common/primitives.js";

export const relayProfileSchema = z.object({
  id: identifierSchema,
  displayName: nonEmptyStringSchema,
  readUrls: z.array(websocketUrlSchema).min(1),
  writeUrls: z.array(websocketUrlSchema).min(1),
  authMode: z.enum(["none", "nip42"]).default("none")
});

export const gitServiceProfileSchema = z.object({
  id: identifierSchema,
  displayName: nonEmptyStringSchema,
  baseUrl: httpUrlSchema,
  transportKind: z.enum(["ssh", "https"]).default("ssh"),
  authMode: z.enum(["ssh_key", "https_token", "http_signature"]).default(
    "ssh_key"
  ),
  defaultNamespace: identifierSchema.optional()
});

export const modelEndpointProfileSchema = z.object({
  id: identifierSchema,
  displayName: nonEmptyStringSchema,
  adapterKind: z.enum(["anthropic", "openai_compatible"]),
  baseUrl: httpUrlSchema,
  authMode: z.enum(["api_key_bearer", "header_secret"]).default(
    "api_key_bearer"
  ),
  secretRef: secretRefSchema,
  defaultModel: nonEmptyStringSchema.optional()
});

export const deploymentResourceDefaultsSchema = z.object({
  relayProfileRefs: z.array(identifierSchema).default([]),
  gitServiceRef: identifierSchema.optional(),
  modelEndpointRef: identifierSchema.optional()
});

export const deploymentResourceCatalogSchema = z.object({
  schemaVersion: z.literal("1"),
  catalogId: identifierSchema,
  relays: z.array(relayProfileSchema).default([]),
  gitServices: z.array(gitServiceProfileSchema).default([]),
  modelEndpoints: z.array(modelEndpointProfileSchema).default([]),
  defaults: deploymentResourceDefaultsSchema.default({
    relayProfileRefs: []
  })
});

export type RelayProfile = z.infer<typeof relayProfileSchema>;
export type GitServiceProfile = z.infer<typeof gitServiceProfileSchema>;
export type ModelEndpointProfile = z.infer<typeof modelEndpointProfileSchema>;
export type DeploymentResourceCatalog = z.infer<
  typeof deploymentResourceCatalogSchema
>;

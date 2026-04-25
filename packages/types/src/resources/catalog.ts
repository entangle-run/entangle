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

export const gitRemoteBaseSchema = z.string().superRefine((value, context) => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected a valid git remote base URL."
    });
    return;
  }

  if (!["ssh:", "http:", "https:", "file:"].includes(parsed.protocol)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Git remote bases must use ssh://, http://, https://, or file://."
    });
  }

  if (parsed.search || parsed.hash) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Git remote bases must not include query or fragment components."
    });
  }
});

export const gitServiceProvisioningSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("preexisting")
  }),
  z.object({
    mode: z.literal("gitea_api"),
    apiBaseUrl: httpUrlSchema,
    secretRef: secretRefSchema
  })
]);

export const gitServiceProfileSchema = z
  .object({
    id: identifierSchema,
    displayName: nonEmptyStringSchema,
    baseUrl: httpUrlSchema,
    remoteBase: gitRemoteBaseSchema,
    transportKind: z.enum(["ssh", "https", "file"]).default("ssh"),
    authMode: z.enum(["ssh_key", "https_token", "http_signature"]).default(
      "ssh_key"
    ),
    defaultNamespace: identifierSchema.optional(),
    provisioning: gitServiceProvisioningSchema.default({
      mode: "preexisting"
    })
  })
  .superRefine((value, context) => {
    const remoteProtocol = new URL(value.remoteBase).protocol;

    if (value.transportKind === "ssh" && remoteProtocol !== "ssh:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SSH git services must use an ssh:// remote base.",
        path: ["remoteBase"]
      });
    }

    if (
      value.transportKind === "https" &&
      !["http:", "https:"].includes(remoteProtocol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "HTTPS git services must use an http:// or https:// remote base.",
        path: ["remoteBase"]
      });
    }

    if (value.transportKind === "file" && remoteProtocol !== "file:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File git services must use a file:// remote base.",
        path: ["remoteBase"]
      });
    }
  });

export const modelEndpointAdapterKindSchema = z.enum([
  "anthropic",
  "openai_compatible"
]);

export const modelEndpointProfileSchema = z.object({
  id: identifierSchema,
  displayName: nonEmptyStringSchema,
  adapterKind: modelEndpointAdapterKindSchema,
  baseUrl: httpUrlSchema,
  authMode: z.enum(["api_key_bearer", "header_secret"]),
  secretRef: secretRefSchema,
  defaultModel: nonEmptyStringSchema.optional()
});

export const agentEngineProfileKindSchema = z.enum([
  "opencode_server",
  "claude_agent_sdk",
  "external_process",
  "external_http"
]);

export const agentEngineProfileSchema = z
  .object({
    id: identifierSchema,
    displayName: nonEmptyStringSchema,
    kind: agentEngineProfileKindSchema,
    version: nonEmptyStringSchema.optional(),
    executable: nonEmptyStringSchema.optional(),
    baseUrl: httpUrlSchema.optional(),
    defaultAgent: identifierSchema.optional(),
    stateScope: z.enum(["node", "shared"]).default("node")
  })
  .superRefine((value, context) => {
    if (
      value.kind === "opencode_server" ||
      value.kind === "external_process"
    ) {
      if (!value.executable && !value.baseUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Process-backed agent engine profiles must declare an executable or a base URL.",
          path: ["executable"]
        });
      }
    }

    if (value.kind === "external_http" && !value.baseUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTTP agent engine profiles must declare a base URL.",
        path: ["baseUrl"]
      });
    }

  });

export const defaultOpenCodeAgentEngineProfile = {
  id: "local-opencode",
  displayName: "Local OpenCode",
  kind: "opencode_server" as const,
  executable: "opencode",
  stateScope: "node" as const
};

export const deploymentResourceDefaultsSchema = z.object({
  relayProfileRefs: z.array(identifierSchema).default([]),
  gitServiceRef: identifierSchema.optional(),
  modelEndpointRef: identifierSchema.optional(),
  agentEngineProfileRef: identifierSchema.optional()
});

export const deploymentResourceCatalogSchema = z.object({
  schemaVersion: z.literal("1"),
  catalogId: identifierSchema,
  relays: z.array(relayProfileSchema).default([]),
  gitServices: z.array(gitServiceProfileSchema).default([]),
  modelEndpoints: z.array(modelEndpointProfileSchema).default([]),
  agentEngineProfiles: z
    .array(agentEngineProfileSchema)
    .min(1)
    .default([defaultOpenCodeAgentEngineProfile]),
  defaults: deploymentResourceDefaultsSchema.default({
    relayProfileRefs: []
  })
});

export type RelayProfile = z.infer<typeof relayProfileSchema>;
export type GitRemoteBase = z.infer<typeof gitRemoteBaseSchema>;
export type GitServiceProvisioning = z.infer<
  typeof gitServiceProvisioningSchema
>;
export type GitServiceProfile = z.infer<typeof gitServiceProfileSchema>;
export type ModelEndpointAdapterKind = z.infer<
  typeof modelEndpointAdapterKindSchema
>;
export type ModelEndpointProfile = z.infer<typeof modelEndpointProfileSchema>;
export type AgentEngineProfileKind = z.infer<
  typeof agentEngineProfileKindSchema
>;
export type AgentEngineProfile = z.infer<typeof agentEngineProfileSchema>;
export type DeploymentResourceCatalog = z.infer<
  typeof deploymentResourceCatalogSchema
>;

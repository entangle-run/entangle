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

  if (!["ssh:", "http:", "https:"].includes(parsed.protocol)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Git remote bases must use ssh://, http://, or https://."
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
    transportKind: z.enum(["ssh", "https"]).default("ssh"),
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
export type GitRemoteBase = z.infer<typeof gitRemoteBaseSchema>;
export type GitServiceProvisioning = z.infer<
  typeof gitServiceProvisioningSchema
>;
export type GitServiceProfile = z.infer<typeof gitServiceProfileSchema>;
export type ModelEndpointProfile = z.infer<typeof modelEndpointProfileSchema>;
export type DeploymentResourceCatalog = z.infer<
  typeof deploymentResourceCatalogSchema
>;

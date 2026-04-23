import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import type { GitServiceProfile } from "../resources/catalog.js";

export const gitRepositoryTargetSchema = z.object({
  gitServiceRef: identifierSchema,
  namespace: identifierSchema,
  provisioningMode: z.enum(["preexisting", "gitea_api"]),
  remoteUrl: nonEmptyStringSchema,
  repositoryName: identifierSchema,
  transportKind: z.enum(["ssh", "https"])
});

export type GitRepositoryTarget = z.infer<typeof gitRepositoryTargetSchema>;

export function buildGitRemoteUrl(input: {
  namespace: string;
  remoteBase: string;
  repositoryName: string;
}): string {
  const parsed = new URL(input.remoteBase);
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/${input.namespace}/${input.repositoryName}.git`;
  return parsed.toString();
}

export function buildGitRepositoryTarget(input: {
  namespace: string;
  repositoryName: string;
  service: GitServiceProfile;
}): GitRepositoryTarget {
  return {
    gitServiceRef: input.service.id,
    namespace: input.namespace,
    provisioningMode: input.service.provisioning.mode,
    remoteUrl: buildGitRemoteUrl({
      namespace: input.namespace,
      remoteBase: input.service.remoteBase,
      repositoryName: input.repositoryName
    }),
    repositoryName: input.repositoryName,
    transportKind: input.service.transportKind
  };
}

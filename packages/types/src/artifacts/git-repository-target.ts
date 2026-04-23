import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const gitRepositoryTargetSchema = z.object({
  gitServiceRef: identifierSchema,
  namespace: identifierSchema,
  provisioningMode: z.enum(["preexisting", "gitea_api"]),
  remoteUrl: nonEmptyStringSchema,
  repositoryName: identifierSchema,
  transportKind: z.enum(["ssh", "https"])
});

export type GitRepositoryTarget = z.infer<typeof gitRepositoryTargetSchema>;

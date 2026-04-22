import { z } from "zod";
import { identifierSchema } from "../common/primitives.js";

export const artifactRefSchema = z.object({
  artifactId: identifierSchema,
  backend: z.enum(["git", "wiki", "local_file"]),
  locator: z.record(z.string(), z.unknown()),
  preferred: z.boolean().default(true)
});

export type ArtifactRef = z.infer<typeof artifactRefSchema>;

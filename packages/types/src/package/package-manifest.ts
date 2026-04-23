import { z } from "zod";
import {
  identifierSchema,
  nonEmptyStringSchema,
  semverishVersionSchema
} from "../common/primitives.js";
import { nodeKindSchema } from "../common/topology.js";

export const agentPackageManifestSchema = z.object({
  schemaVersion: z.literal("1"),
  packageId: identifierSchema,
  name: nonEmptyStringSchema,
  version: semverishVersionSchema,
  packageKind: z.literal("template"),
  defaultNodeKind: nodeKindSchema,
  capabilities: z.array(identifierSchema).default([]),
  entryPrompts: z
    .object({
      system: nonEmptyStringSchema.default("prompts/system.md"),
      interaction: nonEmptyStringSchema.default("prompts/interaction.md")
    })
    .default({
      system: "prompts/system.md",
      interaction: "prompts/interaction.md"
    }),
  memoryProfile: z
    .object({
      wikiSeedPath: nonEmptyStringSchema.default("memory/seed/wiki"),
      schemaPath: nonEmptyStringSchema.default("memory/schema/AGENTS.md")
    })
    .default({
      wikiSeedPath: "memory/seed/wiki",
      schemaPath: "memory/schema/AGENTS.md"
    }),
  runtime: z
    .object({
      configPath: nonEmptyStringSchema.default("runtime/config.json"),
      capabilitiesPath: nonEmptyStringSchema.default(
        "runtime/capabilities.json"
      ),
      toolsPath: nonEmptyStringSchema.default("runtime/tools.json")
    })
    .default({
      configPath: "runtime/config.json",
      capabilitiesPath: "runtime/capabilities.json",
      toolsPath: "runtime/tools.json"
    }),
  metadata: z
    .object({
      description: nonEmptyStringSchema.optional(),
      tags: z.array(identifierSchema).default([])
    })
    .default({
      tags: []
    })
});

export type AgentPackageManifest = z.infer<typeof agentPackageManifestSchema>;

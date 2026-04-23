import { z } from "zod";
import { engineToolDefinitionSchema } from "../engine/turn-contract.js";
import { identifierSchema } from "../common/primitives.js";

export const packageToolExecutionBindingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("builtin"),
    builtinToolId: identifierSchema
  })
]);

export const packageToolDefinitionSchema = engineToolDefinitionSchema.extend({
  execution: packageToolExecutionBindingSchema
});

export const packageToolCatalogSchema = z
  .object({
    schemaVersion: z.literal("1"),
    tools: z.array(packageToolDefinitionSchema).default([])
  })
  .superRefine((value, context) => {
    const seenToolIds = new Set<string>();

    value.tools.forEach((tool, index) => {
      if (seenToolIds.has(tool.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tool catalog contains a duplicate tool id '${tool.id}'.`,
          path: ["tools", index, "id"]
        });
        return;
      }

      seenToolIds.add(tool.id);
    });
  });

export type PackageToolExecutionBinding = z.infer<
  typeof packageToolExecutionBindingSchema
>;
export type PackageToolDefinition = z.infer<typeof packageToolDefinitionSchema>;
export type PackageToolCatalog = z.infer<typeof packageToolCatalogSchema>;

import { z } from "zod";
import { nonEmptyStringSchema } from "./primitives.js";

export const policyOperationSchema = z.enum([
  "filesystem_read",
  "filesystem_write",
  "filesystem_access",
  "command_execution",
  "git_commit",
  "git_push",
  "artifact_publication",
  "source_application",
  "source_publication",
  "wiki_update",
  "peer_message",
  "graph_mutation",
  "approval_request",
  "network_access",
  "subagent_execution",
  "tool_execution",
  "unknown"
]);

export const policyResourceKindSchema = z.enum([
  "source_change_candidate",
  "source_history",
  "source_history_publication",
  "artifact",
  "git_target",
  "workspace",
  "wiki_page",
  "node",
  "edge",
  "graph",
  "session",
  "conversation",
  "tool",
  "unknown"
]);

export const policyResourceScopeSchema = z.object({
  id: nonEmptyStringSchema,
  kind: policyResourceKindSchema,
  label: nonEmptyStringSchema.optional()
});

export type PolicyOperation = z.infer<typeof policyOperationSchema>;
export type PolicyResourceKind = z.infer<typeof policyResourceKindSchema>;
export type PolicyResourceScope = z.infer<typeof policyResourceScopeSchema>;

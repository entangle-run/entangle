import { z } from "zod";
import { identifierSchema, httpUrlSchema, websocketUrlSchema } from "../common/primitives.js";
import { runtimeNodeKindSchema } from "../federation/runner.js";
import { agentEngineProfileKindSchema } from "../resources/catalog.js";

export const distributedProofAssignmentProfileSchema = z.object({
  assignmentId: identifierSchema,
  nodeId: identifierSchema,
  runnerId: identifierSchema,
  runtimeKinds: z.array(runtimeNodeKindSchema).min(1)
});

export const distributedProofProfileSchema = z
  .object({
    agentEngineKind: agentEngineProfileKindSchema.default("opencode_server"),
    agentEngineKinds: z.array(agentEngineProfileKindSchema).default([]),
    agentNodeId: identifierSchema.default("builder"),
    agentRunnerId: identifierSchema.default("distributed-agent-runner"),
    assignments: z.array(distributedProofAssignmentProfileSchema).default([]),
    checkGitBackendHealth: z.boolean().optional(),
    checkRelayHealth: z.boolean().optional(),
    checkUserClientHealth: z.boolean().optional(),
    gitServiceRefs: z.array(identifierSchema).default([]),
    hostUrl: httpUrlSchema.optional(),
    relayUrls: z.array(websocketUrlSchema).default([]),
    requireConversation: z.boolean().optional(),
    requireArtifactEvidence: z.boolean().optional(),
    reviewerUserNodeId: identifierSchema.default("reviewer"),
    reviewerUserRunnerId: identifierSchema.default(
      "distributed-reviewer-user-runner"
    ),
    schemaVersion: z.literal(1),
    userNodeId: identifierSchema.default("user"),
    userRunnerId: identifierSchema.default("distributed-user-runner")
  })
  .superRefine((value, context) => {
    if (
      value.agentEngineKinds.length > 0 &&
      !value.agentEngineKinds.includes(value.agentEngineKind)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "The primary distributed proof agentEngineKind must be listed in agentEngineKinds.",
        path: ["agentEngineKind"]
      });
    }

    for (const expected of [
      {
        label: "agent",
        nodeId: value.agentNodeId,
        runnerId: value.agentRunnerId,
        runtimeKind: "agent_runner" as const
      },
      {
        label: "primary user",
        nodeId: value.userNodeId,
        runnerId: value.userRunnerId,
        runtimeKind: "human_interface" as const
      },
      {
        label: "reviewer user",
        nodeId: value.reviewerUserNodeId,
        runnerId: value.reviewerUserRunnerId,
        runtimeKind: "human_interface" as const
      }
    ]) {
      const assignment = value.assignments.find(
        (entry) =>
          entry.nodeId === expected.nodeId && entry.runnerId === expected.runnerId
      );

      if (!assignment) {
        continue;
      }

      if (!assignment.runtimeKinds.includes(expected.runtimeKind)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The ${expected.label} distributed proof assignment must include runtime kind '${expected.runtimeKind}'.`,
          path: ["assignments"]
        });
      }
    }
  });

export type DistributedProofAssignmentProfile = z.infer<
  typeof distributedProofAssignmentProfileSchema
>;
export type DistributedProofProfile = z.infer<typeof distributedProofProfileSchema>;

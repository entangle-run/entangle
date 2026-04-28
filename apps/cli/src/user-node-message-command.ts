import {
  entangleA2AApprovalResponseDecisionSchema,
  policyOperationSchema,
  policyResourceScopeSchema,
  type ParsedUserNodeMessagePublishRequest,
  type UserNodeMessagePublishRequest,
  type UserNodeMessageRecord
} from "@entangle/types";

export type UserNodeApprovalContextCliOptions = {
  approvalOperation?: string;
  approvalReason?: string;
  approvalResourceId?: string;
  approvalResourceKind?: string;
  approvalResourceLabel?: string;
};

export type UserNodeApprovalMetadata = NonNullable<
  ParsedUserNodeMessagePublishRequest["approval"]
>;

export function hasUserNodeApprovalContextOptions(
  options: UserNodeApprovalContextCliOptions
): boolean {
  return Boolean(
    options.approvalOperation ||
      options.approvalReason ||
      options.approvalResourceId ||
      options.approvalResourceKind ||
      options.approvalResourceLabel
  );
}

export function buildUserNodeApprovalMetadata(input: {
  approvalId: string;
  decision: string;
  options?: UserNodeApprovalContextCliOptions;
}): UserNodeApprovalMetadata {
  const options = input.options ?? {};
  const decision = entangleA2AApprovalResponseDecisionSchema.parse(
    input.decision
  );
  const approval: UserNodeApprovalMetadata = {
    approvalId: input.approvalId,
    decision
  };

  if (options.approvalOperation) {
    approval.operation = policyOperationSchema.parse(
      options.approvalOperation
    );
  }

  if (options.approvalReason) {
    approval.reason = options.approvalReason;
  }

  const hasResourceId = Boolean(options.approvalResourceId);
  const hasResourceKind = Boolean(options.approvalResourceKind);
  const hasResourceLabel = Boolean(options.approvalResourceLabel);

  if (hasResourceId !== hasResourceKind) {
    throw new Error(
      "Approval resource context requires both --approval-resource-id and --approval-resource-kind."
    );
  }

  if (hasResourceLabel && (!hasResourceId || !hasResourceKind)) {
    throw new Error(
      "Approval resource labels require --approval-resource-id and --approval-resource-kind."
    );
  }

  if (options.approvalResourceId && options.approvalResourceKind) {
    approval.resource = policyResourceScopeSchema.parse({
      id: options.approvalResourceId,
      kind: options.approvalResourceKind,
      ...(options.approvalResourceLabel
        ? { label: options.approvalResourceLabel }
        : {})
    });
  }

  return approval;
}

export function buildUserNodeApprovalPublishRequestFromMessage(input: {
  approvalId?: string;
  decision: string;
  message: UserNodeMessageRecord;
  options?: UserNodeApprovalContextCliOptions;
  summary?: string;
}): UserNodeMessagePublishRequest {
  if (
    input.message.direction !== "inbound" ||
    input.message.messageType !== "approval.request" ||
    !input.message.approval
  ) {
    throw new Error(
      "--from-message must reference an inbound approval.request message."
    );
  }

  const approvalId = input.approvalId ?? input.message.approval.approvalId;

  if (input.approvalId && input.approvalId !== input.message.approval.approvalId) {
    throw new Error(
      `Approval id '${input.approvalId}' does not match message approval id '${input.message.approval.approvalId}'.`
    );
  }

  const overrideOptions = input.options ?? {};
  const inheritedOptions: UserNodeApprovalContextCliOptions = {
    ...(input.message.approval.operation
      ? { approvalOperation: input.message.approval.operation }
      : {}),
    ...(input.message.approval.reason
      ? { approvalReason: input.message.approval.reason }
      : {}),
    ...(input.message.approval.resource
      ? {
          approvalResourceId: input.message.approval.resource.id,
          approvalResourceKind: input.message.approval.resource.kind,
          ...(input.message.approval.resource.label
            ? { approvalResourceLabel: input.message.approval.resource.label }
            : {})
        }
      : {}),
    ...(overrideOptions.approvalOperation
      ? { approvalOperation: overrideOptions.approvalOperation }
      : {}),
    ...(overrideOptions.approvalReason
      ? { approvalReason: overrideOptions.approvalReason }
      : {}),
    ...(overrideOptions.approvalResourceId
      ? { approvalResourceId: overrideOptions.approvalResourceId }
      : {}),
    ...(overrideOptions.approvalResourceKind
      ? { approvalResourceKind: overrideOptions.approvalResourceKind }
      : {}),
    ...(overrideOptions.approvalResourceLabel
      ? { approvalResourceLabel: overrideOptions.approvalResourceLabel }
      : {})
  };
  const decision = entangleA2AApprovalResponseDecisionSchema.parse(input.decision);
  const defaultSummary =
    decision === "approved"
      ? `Approved ${approvalId}.`
      : `Rejected ${approvalId}.`;

  return {
    approval: buildUserNodeApprovalMetadata({
      approvalId,
      decision,
      options: inheritedOptions
    }),
    conversationId: input.message.conversationId,
    messageType: "approval.response",
    parentMessageId: input.message.eventId,
    sessionId: input.message.sessionId,
    summary: input.summary ?? defaultSummary,
    targetNodeId: input.message.fromNodeId,
    turnId: input.message.turnId
  };
}

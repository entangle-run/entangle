import {
  entangleA2AApprovalResponseDecisionSchema,
  policyOperationSchema,
  policyResourceScopeSchema,
  type ParsedUserNodeMessagePublishRequest
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

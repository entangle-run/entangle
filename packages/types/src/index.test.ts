import { describe, expect, it } from "vitest";
import {
  approvalTraceEventSchema,
  agentEngineProfileSchema,
  agentEngineProfileUpsertRequestSchema,
  agentEngineTurnResultSchema,
  artifactRecordSchema,
  classifyRuntimeReconciliation,
  deploymentResourceCatalogSchema,
  distributedProofProfileSchema,
  edgeCreateRequestSchema,
  entangleA2AApprovalRequestMetadataSchema,
  entangleA2AApprovalResponseMetadataSchema,
  entangleA2AMessageSchema,
  entangleA2ASourceChangeReviewMetadataSchema,
  entangleControlEventSchema,
  entangleObservationEventSchema,
  entangleNostrGiftWrapKind,
  entangleNostrRumorKind,
  engineToolExecutionObservationSchema,
  engineToolExecutionRequestSchema,
  engineToolExecutionResultSchema,
  engineTurnOutcomeSchema,
  externalPrincipalDeletionResponseSchema,
  externalPrincipalRecordSchema,
  focusedRegisterStateSchema,
  graphSpecSchema,
  graphRevisionInspectionResponseSchema,
  gitRepositoryProvisioningRecordSchema,
  gitServiceProfileSchema,
  hostAuthorityRecordSchema,
  hostAuthorityExportResponseSchema,
  hostAuthorityImportRequestSchema,
  hostAuthorityInspectionResponseSchema,
  hostErrorResponseSchema,
  hostEventListQuerySchema,
  hostProjectionSnapshotSchema,
  hostEventRecordSchema,
  hostSessionConsistencyFindingSchema,
  hostSessionSummarySchema,
  hostArtifactBackendCacheClearResponseSchema,
  hostStatusResponseSchema,
  stateLayoutRecordSchema,
  isAllowedApprovalLifecycleTransition,
  isAllowedConversationLifecycleTransition,
  isAllowedSessionLifecycleTransition,
  modelEndpointProfileSchema,
  modelRuntimeContextSchema,
  nodeCreateRequestSchema,
  nodeInspectionResponseSchema,
  observedRuntimeRecordSchema,
  operatorIdentityRecordSchema,
  operatorPermissionSchema,
  packageToolCatalogSchema,
  reconciliationSnapshotSchema,
  runtimeAssignmentListResponseSchema,
  runtimeAssignmentOfferRequestSchema,
  runtimeAssignmentRevokeResponseSchema,
  runtimeAssignmentTimelineResponseSchema,
  runtimeProjectionRecordSchema,
  runnerRegistrationRecordSchema,
  runnerJoinConfigSchema,
  runnerRegistryEntrySchema,
  runnerRegistryListResponseSchema,
  runnerTrustMutationResponseSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  runtimeAssignmentRecordSchema,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryResponseSchema,
  resolvedSecretBindingSchema,
  runtimeArtifactInspectionResponseSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  runtimeCommandReceiptPayloadSchema,
  runtimeCommandReceiptProjectionRecordSchema,
  runtimeStatusObservationPayloadSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryPublishRequestSchema,
  sourceHistoryReplayRecordSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runtimeWikiPublishRequestSchema,
  sessionCancellationRequestRecordSchema,
  sessionCancellationResponseSchema,
  resolveEffectiveAgentRuntime,
  resolveGitPrincipalBindingForService,
  resolveGitRepositoryTargetForArtifactLocator,
  resolvePrimaryGitRepositoryTarget,
  secretRefSchema,
  userInteractionGatewayRecordSchema,
  userNodeConversationReadResponseSchema,
  userNodeConversationResponseSchema,
  userNodeIdentityInspectionResponseSchema,
  userNodeIdentityListResponseSchema,
  userNodeIdentityRecordSchema,
  userNodeInboxResponseSchema,
  userNodeInboundMessageRecordRequestSchema,
  userNodeMessageInspectionResponseSchema,
  userNodeMessageRecordSchema,
  userNodeMessagePublishRequestSchema,
  userNodeMessagePublishResponseSchema
} from "./index.js";

const authorityPubkey =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const runnerPubkey =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const userNodePubkey =
  "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const eventId = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const payloadHash =
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const signature =
  "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const observedAt = "2026-04-26T10:00:00.000Z";

function buildSignedEnvelope(input: {
  protocol: "entangle.control.v1" | "entangle.observe.v1";
  signerPubkey: string;
  recipientPubkey: string;
}): Record<string, unknown> {
  return {
    createdAt: observedAt,
    eventId,
    payloadHash,
    protocol: input.protocol,
    recipientPubkey: input.recipientPubkey,
    schemaVersion: "1",
    signature,
    signerPubkey: input.signerPubkey
  };
}

function buildOfferedAssignment(): Record<string, unknown> {
  return {
    assignmentId: "assignment-alpha",
    graphId: "team-alpha",
    graphRevisionId: "team-alpha-rev-1",
    hostAuthorityPubkey: authorityPubkey,
    nodeId: "worker-it",
    offeredAt: observedAt,
    runnerId: "runner-alpha",
    runnerPubkey,
    runtimeKind: "agent_runner",
    schemaVersion: "1",
    status: "offered",
    updatedAt: observedAt
  };
}

describe("host API error contracts", () => {
  it("accepts unauthorized responses from the bootstrap host auth boundary", () => {
    expect(
      hostErrorResponseSchema.parse({
        code: "unauthorized",
        message: "Entangle host operator token is required."
      })
    ).toEqual({
      code: "unauthorized",
      message: "Entangle host operator token is required."
    });
  });

  it("accepts forbidden responses from the bootstrap host auth boundary", () => {
    expect(
      hostErrorResponseSchema.parse({
        code: "forbidden",
        message: "Entangle host operator role 'viewer' cannot mutate Host state."
      })
    ).toEqual({
      code: "forbidden",
      message: "Entangle host operator role 'viewer' cannot mutate Host state."
    });
  });
});

describe("operator identity contracts", () => {
  it("accepts scoped operator identity records", () => {
    expect(operatorPermissionSchema.parse("host.assignments.write")).toBe(
      "host.assignments.write"
    );

    expect(
      operatorIdentityRecordSchema.parse({
        createdAt: observedAt,
        displayName: "Assignment operator",
        hostAuthorityPubkey: authorityPubkey,
        operatorId: "assignment-ops",
        permissions: ["host.read", "host.assignments.write"],
        publicKey: userNodePubkey,
        role: "operator",
        schemaVersion: "1",
        updatedAt: observedAt
      })
    ).toMatchObject({
      operatorId: "assignment-ops",
      permissions: ["host.read", "host.assignments.write"],
      role: "operator"
    });
  });
});

describe("federated runtime contracts", () => {
  it("accepts authority, runner, user-node, and gateway identity records", () => {
    expect(
      hostAuthorityRecordSchema.parse({
        authorityId: "authority-main",
        createdAt: observedAt,
        displayName: "Main Host Authority",
        keyRef: "secret://host-authority/main",
        publicKey: authorityPubkey,
        schemaVersion: "1",
        status: "active",
        updatedAt: observedAt
      }).publicKey
    ).toBe(authorityPubkey);

    expect(
      runnerRegistrationRecordSchema.parse({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        firstSeenAt: observedAt,
        hostAuthorityPubkey: authorityPubkey,
        publicKey: runnerPubkey,
        runnerId: "runner-alpha",
        schemaVersion: "1",
        trustState: "trusted",
        updatedAt: observedAt
      }).capabilities.maxAssignments
    ).toBe(1);

    expect(
      userNodeIdentityRecordSchema.parse({
        createdAt: observedAt,
        displayName: "User",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        keyRef: "secret://user-nodes/user-main",
        nodeId: "user-main",
        publicKey: userNodePubkey,
        schemaVersion: "1",
        status: "active",
        updatedAt: observedAt
      }).publicKey
    ).toBe(userNodePubkey);

    expect(
      userInteractionGatewayRecordSchema.parse({
        createdAt: observedAt,
        gatewayId: "studio-main",
        hostAuthorityPubkey: authorityPubkey,
        kind: "studio",
        schemaVersion: "1",
        status: "active",
        updatedAt: observedAt,
        userNodeId: "user-main"
      }).kind
    ).toBe("studio");
  });

  it("accepts User Node identity API responses without exposing secrets", () => {
    const userNode = userNodeIdentityRecordSchema.parse({
      createdAt: observedAt,
      displayName: "Operator",
      gatewayIds: ["studio-main"],
      graphId: "team-alpha",
      hostAuthorityPubkey: authorityPubkey,
      keyRef: "secret://user-nodes/team-alpha-user-main",
      nodeId: "user-main",
      publicKey: userNodePubkey,
      schemaVersion: "1",
      status: "active",
      updatedAt: observedAt
    });
    const gateway = userInteractionGatewayRecordSchema.parse({
      createdAt: observedAt,
      gatewayId: "studio-main",
      hostAuthorityPubkey: authorityPubkey,
      kind: "studio",
      schemaVersion: "1",
      status: "active",
      updatedAt: observedAt,
      userNodeId: "user-main"
    });

    expect(
      userNodeIdentityListResponseSchema.parse({
        generatedAt: observedAt,
        userNodes: [userNode]
      }).userNodes[0]?.publicKey
    ).toBe(userNodePubkey);
    expect(
      userNodeIdentityInspectionResponseSchema.parse({
        gateways: [gateway],
        userNode
      }).gateways[0]?.gatewayId
    ).toBe("studio-main");

    expect(
      userNodeInboxResponseSchema.parse({
        conversations: [
          {
            conversationId: "conversation-alpha",
            graphId: "team-alpha",
            lastMessageAt: observedAt,
            lastReadAt: observedAt,
            peerNodeId: "worker-it",
            pendingApprovalIds: [],
            projection: {
              source: "observation_event",
              updatedAt: observedAt
            },
            unreadCount: 0,
            userNodeId: "user-main"
          }
        ],
        generatedAt: observedAt,
        userNodeId: "user-main"
      }).conversations[0]?.conversationId
    ).toBe("conversation-alpha");
    expect(
      userNodeConversationReadResponseSchema.parse({
        conversation: {
          conversationId: "conversation-alpha",
          graphId: "team-alpha",
          lastReadAt: observedAt,
          peerNodeId: "worker-it",
          projection: {
            source: "observation_event",
            updatedAt: observedAt
          },
          unreadCount: 0,
          userNodeId: "user-main"
        },
        read: {
          conversationId: "conversation-alpha",
          readAt: observedAt,
          userNodeId: "user-main"
        }
      }).read.readAt
    ).toBe(observedAt);

    const messageRecord = userNodeMessageRecordSchema.parse({
      approval: {
        approvalId: "approval-alpha",
        decision: "approved"
      },
      artifactRefs: [],
      conversationId: "conversation-alpha",
      createdAt: observedAt,
      direction: "outbound",
      deliveryErrors: [],
      deliveryStatus: "published",
      eventId:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      fromNodeId: "user-main",
      fromPubkey: userNodePubkey,
      messageType: "question",
      parentMessageId:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      peerNodeId: "worker-it",
      publishedRelays: ["ws://localhost:7777"],
      relayUrls: ["ws://localhost:7777"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      signerPubkey: userNodePubkey,
      summary: "Check the build.",
      toNodeId: "worker-it",
      toPubkey: runnerPubkey,
      turnId: "turn-alpha",
      userNodeId: "user-main"
    });
    expect(
      userNodeConversationResponseSchema.parse({
        conversationId: "conversation-alpha",
        generatedAt: observedAt,
        messages: [messageRecord],
        userNodeId: "user-main"
      }).messages[0]?.approval?.approvalId
    ).toBe("approval-alpha");
    expect(
      userNodeMessageInspectionResponseSchema.parse({
        generatedAt: observedAt,
        message: messageRecord,
        userNodeId: "user-main"
      }).message.eventId
    ).toBe(messageRecord.eventId);
    expect(messageRecord.parentMessageId).toBe(
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    );

    expect(
      userNodeInboundMessageRecordRequestSchema.parse({
        eventId:
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        message: {
          constraints: {
            approvalRequiredBeforeAction: false
          },
          conversationId: "conversation-alpha",
          fromNodeId: "worker-it",
          fromPubkey: runnerPubkey,
          graphId: "team-alpha",
          intent: "Report back to the user.",
          messageType: "task.result",
          parentMessageId:
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          protocol: "entangle.a2a.v1",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 0,
            responseRequired: false
          },
          sessionId: "session-alpha",
          toNodeId: "user-main",
          toPubkey: userNodePubkey,
          turnId: "turn-result",
          work: {
            artifactRefs: [],
            metadata: {},
            summary: "The requested work is complete."
          }
        },
        receivedAt: observedAt,
        signerPubkey: runnerPubkey
      }).message.toNodeId
    ).toBe("user-main");
  });

  it("accepts signed User Node message publish contracts", () => {
    expect(
      userNodeMessagePublishRequestSchema.parse({
        messageType: "approval.response",
        approval: {
          approvalId: "approval-alpha",
          decision: "approved",
          operation: "source_application",
          resource: {
            id: "source-change-alpha",
            kind: "source_change_candidate",
            label: "source-change-alpha"
          }
        },
        parentMessageId:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        summary: "Approved.",
        targetNodeId: "worker-it"
      })
    ).toMatchObject({
      approval: {
        approvalId: "approval-alpha",
        decision: "approved",
        operation: "source_application",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate"
        }
      },
      artifactRefs: [],
      messageType: "approval.response",
      targetNodeId: "worker-it"
    });

    expect(
      userNodeMessagePublishResponseSchema.parse({
        conversationId: "conversation-alpha",
        deliveryErrors: [],
        deliveryStatus: "published",
        eventId:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        fromNodeId: "user-main",
        fromPubkey: userNodePubkey,
        messageType: "approval.response",
        publishedRelays: ["ws://localhost:7777"],
        relayUrls: ["ws://localhost:7777"],
        sessionId: "session-alpha",
        signerPubkey: userNodePubkey,
        targetNodeId: "worker-it",
        toPubkey: runnerPubkey,
        turnId: "turn-alpha"
      }).fromPubkey
    ).toBe(userNodePubkey);

    expect(
      userNodeMessagePublishRequestSchema.parse({
        conversationId: "conversation-alpha",
        messageType: "read.receipt",
        parentMessageId:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        sessionId: "session-alpha",
        summary: "Read conversation-alpha.",
        targetNodeId: "worker-it"
      }).messageType
    ).toBe("read.receipt");
  });

  it("requires active assignments to carry a lease", () => {
    expect(
      runtimeAssignmentRecordSchema.safeParse({
        ...buildOfferedAssignment(),
        acceptedAt: observedAt,
        status: "active"
      }).success
    ).toBe(false);

    expect(
      runtimeAssignmentRecordSchema.parse({
        ...buildOfferedAssignment(),
        acceptedAt: observedAt,
        lease: {
          expiresAt: "2026-04-26T10:10:00.000Z",
          issuedAt: observedAt,
          leaseId: "lease-alpha",
          renewBy: "2026-04-26T10:08:00.000Z"
        },
        status: "active"
      }).lease?.leaseId
    ).toBe("lease-alpha");
  });

  it("accepts generic runner join config without graph context", () => {
    const config = runnerJoinConfigSchema.parse({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        runtimeKinds: ["agent_runner"]
      },
      heartbeatIntervalMs: 1000,
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: "http://host.test",
        runtimeIdentitySecret: {
          mode: "host_api"
        }
      },
      hostAuthorityPubkey: authorityPubkey,
      identity: {
        publicKey: runnerPubkey,
        secretDelivery: {
          envVar: "ENTANGLE_RUNNER_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      },
      relayUrls: ["ws://127.0.0.1:7777"],
      runnerId: "runner-alpha",
      schemaVersion: "1"
    });

    expect(config.authRequired).toBe(false);
    expect(config.capabilities.maxAssignments).toBe(1);
    expect(config.heartbeatIntervalMs).toBe(1000);
    expect(config.hostApi?.baseUrl).toBe("http://host.test");
    expect(config.hostApi?.runtimeIdentitySecret?.mode).toBe("host_api");
    expect(config.identity.publicKey).toBe(runnerPubkey);
  });

  it("accepts authenticated runtime identity secret responses", () => {
    const response = runtimeIdentitySecretResponseSchema.parse({
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      nodeId: "worker-it",
      publicKey: runnerPubkey,
      schemaVersion: "1",
      secretDelivery: {
        envVar: "ENTANGLE_NOSTR_SECRET_KEY",
        mode: "env_var"
      },
      secretKey:
        "1111111111111111111111111111111111111111111111111111111111111111"
    });

    expect(response.nodeId).toBe("worker-it");
    expect(response.secretDelivery.mode).toBe("env_var");
  });

  it("accepts Human Interface Runtime client URLs in observations and projections", () => {
    const status = runtimeStatusObservationPayloadSchema.parse({
      assignmentId: "assignment-user-main",
      clientUrl: "http://127.0.0.1:4173/",
      eventType: "runtime.status",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-rev-1",
      hostAuthorityPubkey: authorityPubkey,
      nodeId: "user-main",
      observedAt,
      observedState: "running",
      protocol: "entangle.observe.v1",
      runnerId: "runner-human",
      runnerPubkey
    });

    expect(status.clientUrl).toBe("http://127.0.0.1:4173/");
    expect(
      observedRuntimeRecordSchema.parse({
        assignmentId: "assignment-user-main",
        backendKind: "federated",
        clientUrl: status.clientUrl,
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-rev-1",
        lastSeenAt: observedAt,
        nodeId: "user-main",
        observedState: "running",
        runnerId: "runner-human",
        runtimeHandle: "federated:runner-human:assignment-user-main",
        schemaVersion: "1"
      }).clientUrl
    ).toBe("http://127.0.0.1:4173/");
    expect(
      runtimeProjectionRecordSchema.parse({
        assignmentId: "assignment-user-main",
        backendKind: "federated",
        clientUrl: status.clientUrl,
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-rev-1",
        hostAuthorityPubkey: authorityPubkey,
        lastSeenAt: observedAt,
        nodeId: "user-main",
        observedState: "running",
        projection: {
          source: "observation_event",
          updatedAt: observedAt
        },
        restartGeneration: 0,
        runnerId: "runner-human"
      }).clientUrl
    ).toBe("http://127.0.0.1:4173/");
  });

  it("accepts runtime command receipt observations and projections", () => {
    const receipt = runtimeCommandReceiptPayloadSchema.parse({
      artifactId: "artifact-alpha",
      assignmentId: "assignment-alpha",
      cancellationId: "cancel-alpha",
      candidateId: "artifact-proposal-alpha",
      commandEventType: "runtime.artifact.propose_source_change",
      commandId: "cmd-artifact-proposal-alpha",
      eventType: "runtime.command.receipt",
      graphId: "team-alpha",
      hostAuthorityPubkey: authorityPubkey,
      message: "Artifact produced a source-change proposal.",
      nodeId: "worker-it",
      observedAt,
      proposalId: "artifact-proposal-alpha",
      protocol: "entangle.observe.v1",
      runnerId: "runner-alpha",
      runnerPubkey,
      sessionId: "session-alpha",
      status: "completed",
      targetPath: "proposals/report.md",
      wikiPageExpectedSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      wikiPageNextSha256:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      wikiPagePreviousSha256:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      wikiPagePath: "operator/notes.md"
    });

    expect(receipt.status).toBe("completed");
    expect(receipt.commandId).toBe("cmd-artifact-proposal-alpha");
    expect(
      runtimeCommandReceiptProjectionRecordSchema.parse({
        artifactId: receipt.artifactId,
        assignmentId: receipt.assignmentId,
        cancellationId: receipt.cancellationId,
        candidateId: receipt.candidateId,
        commandEventType: receipt.commandEventType,
        commandId: receipt.commandId,
        graphId: receipt.graphId,
        hostAuthorityPubkey: receipt.hostAuthorityPubkey,
        nodeId: receipt.nodeId,
        observedAt: receipt.observedAt,
        projection: {
          source: "observation_event",
          updatedAt: observedAt
        },
        proposalId: receipt.proposalId,
        receiptMessage: receipt.message,
        receiptStatus: receipt.status,
        runnerId: receipt.runnerId,
        runnerPubkey: receipt.runnerPubkey,
        sessionId: receipt.sessionId,
        targetPath: receipt.targetPath,
        wikiPageExpectedSha256: receipt.wikiPageExpectedSha256,
        wikiPageNextSha256: receipt.wikiPageNextSha256,
        wikiPagePath: receipt.wikiPagePath,
        wikiPagePreviousSha256: receipt.wikiPagePreviousSha256
      }).candidateId
    ).toBe("artifact-proposal-alpha");
  });

  it("accepts signed control assignment offers from Host Authority", () => {
    const event = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignment: buildOfferedAssignment(),
        eventType: "runtime.assignment.offer",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        protocol: "entangle.control.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });

    expect(event.payload.eventType).toBe("runtime.assignment.offer");
  });

  it("accepts signed runtime lifecycle control commands from Host Authority", () => {
    const start = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        commandId: "cmd-start-alpha",
        eventType: "runtime.start",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });
    const stop = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        commandId: "cmd-stop-alpha",
        eventType: "runtime.stop",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });
    const restart = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        commandId: "cmd-restart-alpha",
        eventType: "runtime.restart",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });
    const cancel = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        cancellation: {
          cancellationId: "cancel-alpha",
          graphId: "team-alpha",
          nodeId: "worker-it",
          requestedAt: observedAt,
          sessionId: "session-alpha",
          status: "requested"
        },
        commandId: "cmd-cancel-alpha",
        eventType: "runtime.session.cancel",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        sessionId: "session-alpha"
      }
    });
    const artifactRestore = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        artifactId: "artifact-alpha",
        artifactRef: {
          artifactId: "artifact-alpha",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/report",
            commit: "abc123",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            path: "reports/session-alpha/report.md",
            repositoryName: "graph-alpha"
          },
          status: "published"
        },
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-restore-alpha",
        eventType: "runtime.artifact.restore",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        requestedBy: "operator-main",
        restoreId: "restore-artifact-alpha",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });
    const sourceHistoryPublish = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        approvalId: "approval-source-history-publication-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-publish-alpha",
        eventType: "runtime.source_history.publish",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        requestedBy: "operator-main",
        retryFailedPublication: true,
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha",
        target: {
          repositoryName: "graph-alpha-public"
        }
      }
    });
    const artifactSourceChangeProposal = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        artifactId: "artifact-alpha",
        artifactRef: {
          artifactId: "artifact-alpha",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/report",
            commit: "abc123",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            path: "reports/session-alpha/report.md",
            repositoryName: "graph-alpha"
          },
          status: "published"
        },
        assignmentId: "assignment-alpha",
        commandId: "cmd-artifact-proposal-alpha",
        eventType: "runtime.artifact.propose_source_change",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        overwrite: false,
        proposalId: "artifact-proposal-alpha",
        protocol: "entangle.control.v1",
        requestedBy: "operator-main",
        runnerId: "runner-alpha",
        runnerPubkey,
        targetPath: "proposals/report.md"
      }
    });
    const sourceHistoryReplay = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        approvalId: "approval-source-history-replay-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-replay-alpha",
        eventType: "runtime.source_history.replay",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        replayedBy: "operator-main",
        replayId: "replay-source-history-alpha",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha"
      }
    });
    const sourceHistoryReconcile = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        approvalId: "approval-source-history-reconcile-alpha",
        assignmentId: "assignment-alpha",
        commandId: "cmd-source-history-reconcile-alpha",
        eventType: "runtime.source_history.reconcile",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        replayedBy: "operator-main",
        replayId: "reconcile-source-history-alpha",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-alpha"
      }
    });
    const wikiPublish = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-publish-alpha",
        eventType: "runtime.wiki.publish",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        nodeId: "worker-it",
        protocol: "entangle.control.v1",
        reason: "Publish runner-owned wiki repository.",
        requestedBy: "operator-main",
        retryFailedPublication: true,
        runnerId: "runner-alpha",
        runnerPubkey,
        target: {
          repositoryName: "wiki-public"
        }
      }
    });
    const wikiUpsertPage = entangleControlEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.control.v1",
        recipientPubkey: runnerPubkey,
        signerPubkey: authorityPubkey
      }),
      payload: {
        assignmentId: "assignment-alpha",
        commandId: "cmd-wiki-upsert-page-alpha",
        content: "# Operator Note\n\nPersist this in runner memory.\n",
        eventType: "runtime.wiki.upsert_page",
        expectedCurrentSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        issuedAt: observedAt,
        mode: "replace",
        nodeId: "worker-it",
        path: "operator/notes.md",
        protocol: "entangle.control.v1",
        reason: "Update runner-owned wiki page.",
        requestedBy: "operator-main",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });

    expect(start.payload.eventType).toBe("runtime.start");
    expect(stop.payload.eventType).toBe("runtime.stop");
    expect(restart.payload.eventType).toBe("runtime.restart");
    expect(cancel.payload.eventType).toBe("runtime.session.cancel");
    expect(artifactRestore.payload.eventType).toBe("runtime.artifact.restore");
    expect(artifactRestore.payload).toMatchObject({
      artifactId: "artifact-alpha",
      restoreId: "restore-artifact-alpha"
    });
    expect(artifactSourceChangeProposal.payload.eventType).toBe(
      "runtime.artifact.propose_source_change"
    );
    expect(artifactSourceChangeProposal.payload).toMatchObject({
      artifactId: "artifact-alpha",
      proposalId: "artifact-proposal-alpha",
      targetPath: "proposals/report.md"
    });
    expect(sourceHistoryPublish.payload.eventType).toBe(
      "runtime.source_history.publish"
    );
    expect(sourceHistoryPublish.payload).toMatchObject({
      approvalId: "approval-source-history-publication-alpha",
      target: {
        repositoryName: "graph-alpha-public"
      }
    });
    expect(sourceHistoryReplay.payload.eventType).toBe(
      "runtime.source_history.replay"
    );
    expect(sourceHistoryReconcile.payload.eventType).toBe(
      "runtime.source_history.reconcile"
    );
    expect(wikiPublish.payload.eventType).toBe("runtime.wiki.publish");
    expect(wikiPublish.payload).toMatchObject({
      target: {
        repositoryName: "wiki-public"
      }
    });
    expect(wikiUpsertPage.payload.eventType).toBe("runtime.wiki.upsert_page");
    expect(wikiUpsertPage.payload).toMatchObject({
      expectedCurrentSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mode: "replace",
      path: "operator/notes.md"
    });
  });

  it("rejects control and observation events signed by the wrong entity", () => {
    expect(
      entangleControlEventSchema.safeParse({
        envelope: buildSignedEnvelope({
          protocol: "entangle.control.v1",
          recipientPubkey: runnerPubkey,
          signerPubkey: userNodePubkey
        }),
        payload: {
          eventType: "runner.hello.ack",
          hostAuthorityPubkey: authorityPubkey,
          issuedAt: observedAt,
          protocol: "entangle.control.v1",
          runnerId: "runner-alpha",
          runnerPubkey,
          trustState: "trusted"
        }
      }).success
    ).toBe(false);

    expect(
      entangleObservationEventSchema.safeParse({
        envelope: buildSignedEnvelope({
          protocol: "entangle.observe.v1",
          recipientPubkey: authorityPubkey,
          signerPubkey: authorityPubkey
        }),
        payload: {
          assignmentIds: [],
          eventType: "runner.heartbeat",
          hostAuthorityPubkey: authorityPubkey,
          observedAt,
          operationalState: "ready",
          protocol: "entangle.observe.v1",
          runnerId: "runner-alpha",
          runnerPubkey
        }
      }).success
    ).toBe(false);
  });

  it("accepts Host projection snapshots assembled from federated state", () => {
    const projection = {
      source: "observation_event",
      updatedAt: observedAt
    };
    const snapshot = hostProjectionSnapshotSchema.parse({
      artifactRefs: [
        {
          artifactId: "artifact-alpha",
          artifactRecord: {
            createdAt: observedAt,
            ref: {
              artifactId: "artifact-alpha",
              artifactKind: "report_file",
              backend: "git",
              locator: {
                branch: "artifact-artifact-alpha",
                commit: "abc123",
                path: "report.md"
              },
              status: "published"
            },
            retrieval: {
              retrievedAt: observedAt,
              state: "retrieved"
            },
            updatedAt: observedAt
          },
          artifactPreview: {
            available: true,
            bytesRead: 18,
            content: "# Report\n\nReady.\n",
            contentEncoding: "utf8",
            contentType: "text/markdown",
            truncated: false
          },
          artifactRef: {
            artifactId: "artifact-alpha",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "artifact-artifact-alpha",
              commit: "abc123",
              path: "report.md"
            },
            status: "published"
          },
          graphId: "team-alpha",
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          runnerId: "runner-alpha",
          runnerPubkey
        }
      ],
      assignments: [
        {
          assignmentId: "assignment-alpha",
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-rev-1",
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          runnerId: "runner-alpha",
          status: "active"
        }
      ],
      assignmentReceipts: [
        {
          assignmentId: "assignment-alpha",
          hostAuthorityPubkey: authorityPubkey,
          observedAt,
          projection,
          receiptKind: "started",
          receiptMessage: "Assignment runtime is running.",
          runnerId: "runner-alpha",
          runnerPubkey
        }
      ],
      freshness: "current",
      generatedAt: observedAt,
      hostAuthorityPubkey: authorityPubkey,
      runtimes: [
        {
          assignmentId: "assignment-alpha",
          backendKind: "federated",
          desiredState: "running",
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-rev-1",
          hostAuthorityPubkey: authorityPubkey,
          lastSeenAt: observedAt,
          nodeId: "worker-it",
          observedState: "running",
          projection,
          restartGeneration: 0,
          runnerId: "runner-alpha",
          runtimeHandle: "federated:runner-alpha:assignment-alpha"
        }
      ],
      runners: [
        {
          assignmentIds: ["assignment-alpha"],
          hostAuthorityPubkey: authorityPubkey,
          operationalState: "ready",
          projection,
          publicKey: runnerPubkey,
          runnerId: "runner-alpha",
          trustState: "trusted"
        }
      ],
      schemaVersion: "1",
      sourceChangeRefs: [
        {
          artifactRefs: [],
          candidateId: "candidate-alpha",
          graphId: "team-alpha",
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          runnerId: "runner-alpha",
          runnerPubkey,
          sourceChangeSummary: {
            additions: 4,
            checkedAt: "2026-04-26T12:00:00.000Z",
            deletions: 1,
            fileCount: 1,
            files: [
              {
                additions: 4,
                deletions: 1,
                path: "src/app.ts",
                status: "modified"
              }
            ],
            status: "changed",
            truncated: false
          },
          status: "pending_review"
        }
      ],
      sourceHistoryRefs: [
        {
          graphId: "team-alpha",
          history: {
            appliedAt: "2026-04-26T12:01:00.000Z",
            appliedBy: "user-main",
            baseTree: "tree-base-alpha",
            branch: "entangle-source-history",
            candidateId: "candidate-alpha",
            commit: "commit-source-history-alpha",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-rev-1",
            headTree: "tree-head-alpha",
            mode: "already_in_workspace",
            nodeId: "worker-it",
            sourceChangeSummary: {
              additions: 4,
              checkedAt: "2026-04-26T12:00:00.000Z",
              deletions: 1,
              fileCount: 1,
              files: [
                {
                  additions: 4,
                  deletions: 1,
                  path: "src/app.ts",
                  status: "modified"
                }
              ],
              status: "changed",
              truncated: false
            },
            sourceHistoryId: "source-history-candidate-alpha",
            turnId: "turn-alpha",
            updatedAt: "2026-04-26T12:01:00.000Z"
          },
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          runnerId: "runner-alpha",
          runnerPubkey,
          sourceHistoryId: "source-history-candidate-alpha"
        }
      ],
      sourceHistoryReplays: [
        {
          graphId: "team-alpha",
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          replay: {
            approvalId: "approval-source-history-replay-alpha",
            baseTree: "tree-base-alpha",
            candidateId: "candidate-alpha",
            commit: "commit-source-history-alpha",
            createdAt: "2026-04-26T12:02:00.000Z",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-rev-1",
            headTree: "tree-head-alpha",
            nodeId: "worker-it",
            replayedBy: "operator-main",
            replayedFileCount: 1,
            replayedPath: "/workspace/source",
            replayId: "replay-source-history-alpha",
            sourceHistoryId: "source-history-candidate-alpha",
            status: "replayed",
            turnId: "turn-alpha",
            updatedAt: "2026-04-26T12:02:00.000Z"
          },
          replayId: "replay-source-history-alpha",
          runnerId: "runner-alpha",
          runnerPubkey,
          sourceHistoryId: "source-history-candidate-alpha"
        }
      ],
      userConversations: [
        {
          conversationId: "conv-alpha",
          graphId: "team-alpha",
          peerNodeId: "worker-it",
          projection,
          unreadCount: 1,
          userNodeId: "user-main"
        }
      ],
      wikiRefs: [
        {
          artifactId: "wiki-alpha",
          artifactPreview: {
            available: true,
            bytesRead: 23,
            content: "# Working Context\nReady.",
            contentEncoding: "utf8",
            contentType: "text/markdown",
            truncated: false
          },
          artifactRef: {
            artifactId: "wiki-alpha",
            artifactKind: "knowledge_summary",
            backend: "wiki",
            locator: {
              nodeId: "worker-it",
              path: "/wiki/summaries/working-context.md"
            },
            status: "published"
          },
          graphId: "team-alpha",
          hostAuthorityPubkey: authorityPubkey,
          nodeId: "worker-it",
          projection,
          runnerId: "runner-alpha",
          runnerPubkey
        }
      ]
    });

    expect(snapshot.artifactRefs[0]?.artifactId).toBe("artifact-alpha");
    expect(snapshot.artifactRefs[0]?.artifactRecord?.retrieval?.state).toBe(
      "retrieved"
    );
    expect(snapshot.assignmentReceipts[0]?.receiptKind).toBe("started");
    expect(snapshot.artifactRefs[0]?.artifactPreview?.available).toBe(true);
    expect(snapshot.runtimes[0]?.nodeId).toBe("worker-it");
    expect(snapshot.sourceChangeRefs[0]?.candidateId).toBe("candidate-alpha");
    expect(snapshot.sourceChangeRefs[0]?.sourceChangeSummary?.fileCount).toBe(1);
    expect(snapshot.sourceHistoryRefs[0]?.sourceHistoryId).toBe(
      "source-history-candidate-alpha"
    );
    expect(snapshot.sourceHistoryReplays[0]?.replay.status).toBe("replayed");
    expect(snapshot.userConversations[0]?.userNodeId).toBe("user-main");
    expect(snapshot.wikiRefs[0]?.artifactId).toBe("wiki-alpha");
    expect(snapshot.wikiRefs[0]?.artifactPreview?.available).toBe(true);
  });

  it("accepts federated session and conversation observations with embedded runner records", () => {
    const sessionObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        eventType: "session.updated",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        session: {
          activeConversationIds: ["conversation-alpha"],
          graphId: "team-alpha",
          intent: "Check signed User Node message intake.",
          lastMessageType: "question",
          openedAt: observedAt,
          ownerNodeId: "worker-it",
          rootArtifactIds: [],
          sessionId: "session-alpha",
          status: "active",
          traceId: "session-alpha",
          updatedAt: observedAt,
          waitingApprovalIds: []
        },
        sessionId: "session-alpha",
        status: "active",
        updatedAt: observedAt
      }
    });
    const conversationObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        conversation: {
          artifactIds: [],
          conversationId: "conversation-alpha",
          followupCount: 0,
          graphId: "team-alpha",
          initiator: "peer",
          lastInboundMessageId:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          lastMessageType: "question",
          localNodeId: "worker-it",
          localPubkey: runnerPubkey,
          openedAt: observedAt,
          peerNodeId: "user-main",
          peerPubkey: authorityPubkey,
          responsePolicy: {
            closeOnResult: false,
            maxFollowups: 0,
            responseRequired: false
          },
          sessionId: "session-alpha",
          status: "opened",
          updatedAt: observedAt
        },
        conversationId: "conversation-alpha",
        eventType: "conversation.updated",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        status: "opened",
        updatedAt: observedAt
      }
    });
    const turnObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        eventType: "turn.updated",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        phase: "receiving",
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        sessionId: "session-alpha",
        turn: {
          consumedArtifactIds: [],
          conversationId: "conversation-alpha",
          emittedHandoffMessageIds: [],
          graphId: "team-alpha",
          nodeId: "worker-it",
          phase: "receiving",
          producedArtifactIds: [],
          requestedApprovalIds: [],
          sessionId: "session-alpha",
          sourceChangeCandidateIds: [],
          startedAt: observedAt,
          triggerKind: "message",
          turnId: "turn-alpha",
          updatedAt: observedAt
        },
        turnId: "turn-alpha",
        updatedAt: observedAt
      }
    });
    const artifactObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        artifactPreview: {
          available: true,
          bytesRead: 18,
          content: "# Report\n\nReady.\n",
          contentEncoding: "utf8",
          contentType: "text/markdown",
          truncated: false
        },
        artifactRef: {
          artifactId: "artifact-alpha",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/report",
            commit: "commit-alpha",
            path: "reports/session-alpha/turn-alpha.md"
          },
          status: "published"
        },
        eventType: "artifact.ref",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      }
    });
    const sourceChangeObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        artifactRefs: [],
        candidate: {
          candidateId: "source-change-turn-alpha",
          createdAt: observedAt,
          graphId: "team-alpha",
          nodeId: "worker-it",
          sourceChangeSummary: {
            additions: 2,
            checkedAt: observedAt,
            deletions: 1,
            fileCount: 1,
            files: [
              {
                additions: 2,
                deletions: 1,
                path: "src/index.ts",
                status: "modified"
              }
            ],
            status: "changed",
            truncated: false
          },
          status: "pending_review",
          turnId: "turn-alpha",
          updatedAt: observedAt
        },
        candidateId: "source-change-turn-alpha",
        eventType: "source_change.ref",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceChangeSummary: {
          additions: 2,
          checkedAt: observedAt,
          deletions: 1,
          fileCount: 1,
          files: [
            {
              additions: 2,
              deletions: 1,
              path: "src/index.ts",
              status: "modified"
            }
          ],
          status: "changed",
          truncated: false
        },
        status: "pending_review"
      }
    });
    const sourceHistoryObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        eventType: "source_history.ref",
        graphId: "team-alpha",
        history: {
          appliedAt: observedAt,
          appliedBy: "user-main",
          baseTree: "tree-base-alpha",
          branch: "entangle-source-history",
          candidateId: "source-change-turn-alpha",
          commit: "commit-source-history-alpha",
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-rev-1",
          headTree: "tree-head-alpha",
          mode: "already_in_workspace",
          nodeId: "worker-it",
          sourceChangeSummary: {
            additions: 2,
            checkedAt: observedAt,
            deletions: 1,
            fileCount: 1,
            files: [
              {
                additions: 2,
                deletions: 1,
                path: "src/index.ts",
                status: "modified"
              }
            ],
            status: "changed",
            truncated: false
          },
          sourceHistoryId: "source-history-source-change-turn-alpha",
          turnId: "turn-alpha",
          updatedAt: observedAt
        },
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-source-change-turn-alpha"
      }
    });
    const sourceHistoryReplayObservation = entangleObservationEventSchema.parse({
      envelope: buildSignedEnvelope({
        protocol: "entangle.observe.v1",
        recipientPubkey: authorityPubkey,
        signerPubkey: runnerPubkey
      }),
      payload: {
        eventType: "source_history.replayed",
        graphId: "team-alpha",
        hostAuthorityPubkey: authorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        replay: {
          approvalId: "approval-source-history-replay-alpha",
          baseTree: "tree-base-alpha",
          candidateId: "source-change-turn-alpha",
          commit: "commit-source-history-alpha",
          createdAt: observedAt,
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-rev-1",
          headTree: "tree-head-alpha",
          nodeId: "worker-it",
          replayedBy: "operator-main",
          replayedFileCount: 1,
          replayedPath: "/workspace/source",
          replayId: "replay-source-history-alpha",
          sourceHistoryId: "source-history-source-change-turn-alpha",
          status: "replayed",
          turnId: "turn-alpha",
          updatedAt: observedAt
        },
        replayId: "replay-source-history-alpha",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceHistoryId: "source-history-source-change-turn-alpha",
        status: "replayed"
      }
    });

    expect(sessionObservation.payload.eventType).toBe("session.updated");
    expect(conversationObservation.payload.eventType).toBe("conversation.updated");
    expect(turnObservation.payload.eventType).toBe("turn.updated");
    expect(artifactObservation.payload.eventType).toBe("artifact.ref");
    expect(sourceChangeObservation.payload.eventType).toBe("source_change.ref");
    expect(sourceHistoryObservation.payload.eventType).toBe("source_history.ref");
    expect(sourceHistoryReplayObservation.payload.eventType).toBe(
      "source_history.replayed"
    );
    expect(
      sourceHistoryReplayRecordSchema.parse({
        approvalId: "approval-source-history-reconcile-alpha",
        baseTree: "tree-base-alpha",
        candidateId: "source-change-turn-alpha",
        commit: "commit-source-history-alpha",
        createdAt: observedAt,
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-rev-1",
        headTree: "tree-head-alpha",
        mergedTree: "tree-merged-alpha",
        nodeId: "worker-it",
        replayedBy: "operator-main",
        replayedFileCount: 2,
        replayedPath: "/workspace/source",
        replayId: "reconcile-source-history-alpha",
        sourceHistoryId: "source-history-source-change-turn-alpha",
        status: "merged",
        turnId: "turn-alpha",
        updatedAt: observedAt
      }).status
    ).toBe("merged");
  });

  it("accepts Host Authority API responses and status summaries", () => {
    const authority = hostAuthorityRecordSchema.parse({
      authorityId: "authority-main",
      createdAt: observedAt,
      keyRef: "secret://host-authority/main",
      publicKey: authorityPubkey,
      schemaVersion: "1",
      status: "active",
      updatedAt: observedAt
    });
    const inspection = hostAuthorityInspectionResponseSchema.parse({
      authority,
      checkedAt: observedAt,
      secret: {
        keyRef: "secret://host-authority/main",
        status: "available"
      }
    });

    expect(inspection.secret.status).toBe("available");
    expect(
      hostAuthorityExportResponseSchema.parse({
        authority,
        exportedAt: observedAt,
        secretKey:
          "1111111111111111111111111111111111111111111111111111111111111111"
      }).authority.publicKey
    ).toBe(authorityPubkey);
    expect(
      hostAuthorityImportRequestSchema.parse({
        authority,
        secretKey:
          "1111111111111111111111111111111111111111111111111111111111111111"
      }).authority.authorityId
    ).toBe("authority-main");
    expect(
      hostStatusResponseSchema.parse({
        authority: {
          authorityId: "authority-main",
          publicKey: authorityPubkey,
          secretStatus: "available",
          status: "active",
          updatedAt: observedAt
        },
        reconciliation: {
          backendKind: "memory",
          blockedRuntimeCount: 0,
          degradedRuntimeCount: 0,
          failedRuntimeCount: 0,
          findingCodes: [],
          issueCount: 0,
          managedRuntimeCount: 0,
          runningRuntimeCount: 0,
          stoppedRuntimeCount: 0,
          transitioningRuntimeCount: 0
        },
        runtimeCounts: {
          desired: 0,
          observed: 0,
          running: 0
        },
        security: {
          operatorAuthMode: "none"
        },
        service: "entangle-host",
        stateLayout: {
          checkedAt: observedAt,
          currentLayoutVersion: 1,
          minimumSupportedLayoutVersion: 1,
          recordedAt: observedAt,
          recordedLayoutVersion: 1,
          status: "current"
        },
        status: "healthy",
        timestamp: observedAt,
        transport: {
          controlObserve: {
            configuredRelayCount: 1,
            relayUrls: ["ws://relay.entangle.test"],
            relays: [
              {
                relayUrl: "ws://relay.entangle.test",
                status: "subscribed",
                subscribedAt: observedAt,
                updatedAt: observedAt
              }
            ],
            status: "subscribed",
            subscribedAt: observedAt,
            updatedAt: observedAt
          }
        }
      }).authority?.authorityId
    ).toBe("authority-main");
  });

  it("accepts runner registry API projections", () => {
    const runner = runnerRegistryEntrySchema.parse({
      heartbeat: {
        assignmentIds: ["assignment-alpha"],
        hostAuthorityPubkey: authorityPubkey,
        lastHeartbeatAt: observedAt,
        operationalState: "ready",
        runnerId: "runner-alpha",
        runnerPubkey,
        schemaVersion: "1",
        updatedAt: observedAt
      },
      liveness: "online",
      offlineAfterSeconds: 300,
      projectedAt: observedAt,
      registration: {
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        firstSeenAt: observedAt,
        hostAuthorityPubkey: authorityPubkey,
        lastSeenAt: observedAt,
        publicKey: runnerPubkey,
        runnerId: "runner-alpha",
        schemaVersion: "1",
        trustState: "pending",
        updatedAt: observedAt
      },
      staleAfterSeconds: 60
    });

    expect(
      runnerRegistryListResponseSchema.parse({
        generatedAt: observedAt,
        runners: [runner]
      }).runners[0]?.liveness
    ).toBe("online");
    expect(
      runnerTrustMutationResponseSchema.parse({
        runner: {
          ...runner,
          registration: {
            ...runner.registration,
            trustState: "trusted"
          }
        }
      }).runner.registration.trustState
    ).toBe("trusted");
  });

  it("accepts runtime assignment host API contracts", () => {
    const assignment = runtimeAssignmentRecordSchema.parse({
      ...buildOfferedAssignment(),
      lease: {
        expiresAt: "2026-04-26T11:00:00.000Z",
        issuedAt: observedAt,
        leaseId: "lease-alpha",
        renewBy: "2026-04-26T10:48:00.000Z"
      }
    });

    expect(
      runtimeAssignmentListResponseSchema.parse({
        assignments: [assignment],
        generatedAt: observedAt
      }).assignments[0]?.assignmentId
    ).toBe("assignment-alpha");
    expect(
      runtimeAssignmentOfferRequestSchema.parse({
        nodeId: "worker-it",
        runnerId: "runner-alpha"
      }).leaseDurationSeconds
    ).toBe(3600);
    expect(
      runtimeAssignmentRevokeResponseSchema.parse({
        assignment: {
          ...assignment,
          revokedAt: observedAt,
          status: "revoked"
        }
      }).assignment.status
    ).toBe("revoked");
    expect(
      runtimeAssignmentTimelineResponseSchema.parse({
        assignment,
        commandReceipts: [
          {
            assignmentId: "assignment-alpha",
            commandEventType: "runtime.start",
            commandId: "cmd-start-alpha",
            graphId: "team-alpha",
            hostAuthorityPubkey: authorityPubkey,
            nodeId: "worker-it",
            observedAt,
            projection: {
              source: "observation_event",
              updatedAt: observedAt
            },
            receiptStatus: "completed",
            runnerId: "runner-alpha",
            runnerPubkey
          }
        ],
        generatedAt: observedAt,
        receipts: [
          {
            assignmentId: "assignment-alpha",
            hostAuthorityPubkey: authorityPubkey,
            observedAt,
            projection: {
              source: "observation_event",
              updatedAt: observedAt
            },
            receiptKind: "started",
            runnerId: "runner-alpha",
            runnerPubkey
          }
        ],
        timeline: [
          {
            assignmentId: "assignment-alpha",
            entryKind: "assignment.offered",
            nodeId: "worker-it",
            runnerId: "runner-alpha",
            status: "offered",
            timestamp: observedAt
          },
          {
            assignmentId: "assignment-alpha",
            entryKind: "assignment.receipt",
            receiptKind: "started",
            runnerId: "runner-alpha",
            timestamp: observedAt
          },
          {
            assignmentId: "assignment-alpha",
            commandEventType: "runtime.start",
            commandId: "cmd-start-alpha",
            entryKind: "runtime.command.receipt",
            receiptStatus: "completed",
            runnerId: "runner-alpha",
            timestamp: observedAt
          }
        ]
      }).timeline[1]?.receiptKind
    ).toBe("started");
  });

  it("accepts federated runtime observation records", () => {
    expect(
      observedRuntimeRecordSchema.parse({
        backendKind: "federated",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-rev-1",
        lastSeenAt: observedAt,
        nodeId: "worker-it",
        observedState: "running",
        runtimeHandle: "federated:runner-alpha:assignment-alpha",
        schemaVersion: "1"
      }).backendKind
    ).toBe("federated");
  });
});

describe("session cancellation contracts", () => {
  it("accepts runtime-owned cancellation records and host responses", () => {
    const cancellation = sessionCancellationRequestRecordSchema.parse({
      cancellationId: "cancel-alpha",
      graphId: "team-alpha",
      nodeId: "worker-it",
      reason: "Operator stopped the session.",
      requestedAt: "2026-04-24T10:00:00.000Z",
      requestedBy: "operator-main",
      sessionId: "session-alpha",
      status: "requested"
    });
    const response = sessionCancellationResponseSchema.parse({
      cancellations: [cancellation],
      sessionId: "session-alpha"
    });

    expect(response.cancellations[0]?.cancellationId).toBe("cancel-alpha");
  });

  it("requires observed cancellation records to include observation time", () => {
    const result = sessionCancellationRequestRecordSchema.safeParse({
      cancellationId: "cancel-alpha",
      graphId: "team-alpha",
      nodeId: "worker-it",
      requestedAt: "2026-04-24T10:00:00.000Z",
      sessionId: "session-alpha",
      status: "observed"
    });

    expect(result.success).toBe(false);
  });
});

describe("runtime inspection host API contracts", () => {
  it("accepts generic agent runtime inspection status", () => {
    const result = runtimeInspectionResponseSchema.parse({
      agentRuntime: {
        defaultAgent: "general",
        engineKind: "opencode_server",
        enginePermissionMode: "auto_reject",
        engineProfileDisplayName: "OpenCode",
        engineProfileRef: "opencode-default",
        lastEngineSessionId: "opencode-session-alpha",
        lastEngineStopReason: "completed",
        lastEngineVersion: "0.10.0",
        lastPermissionDecision: "rejected",
        lastPermissionOperation: "command_execution",
        lastPermissionReason:
          "OpenCode one-shot CLI auto-rejected the permission request.",
        lastProducedArtifactIds: ["artifact-report"],
        lastRequestedApprovalIds: ["approval-source-publication"],
        lastSourceChangeCandidateId: "source-change-turn-alpha",
        lastSourceChangeSummary: {
          additions: 4,
          checkedAt: "2026-04-25T08:05:00.000Z",
          deletions: 1,
          fileCount: 1,
          files: [
            {
              additions: 4,
              deletions: 1,
              path: "src/index.ts",
              status: "modified"
            }
          ],
          status: "changed"
        },
        lastTurnId: "turn-alpha",
        lastTurnUpdatedAt: "2026-04-25T08:05:00.000Z",
        mode: "coding_agent",
        pendingApprovalIds: ["approval-source-publication"],
        stateScope: "node"
      },
      backendKind: "docker",
      contextAvailable: true,
      contextPath: "/tmp/runtime/worker-it/effective-runtime-context.json",
      desiredState: "running",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260425-080000",
      nodeId: "worker-it",
      observedState: "running",
      restartGeneration: 1,
      workspaceHealth: {
        checkedAt: "2026-04-25T08:05:01.000Z",
        layoutVersion: "entangle-workspace-v1",
        status: "ready",
        surfaces: [
          {
            access: ["read", "write"],
            required: true,
            status: "ready",
            surface: "source_workspace"
          }
        ]
      }
    });

    expect(result.agentRuntime?.engineProfileRef).toBe("opencode-default");
    expect(result.agentRuntime?.enginePermissionMode).toBe("auto_reject");
    expect("contextPath" in result).toBe(false);
    expect(result.agentRuntime?.lastEngineSessionId).toBe(
      "opencode-session-alpha"
    );
    expect(result.agentRuntime?.lastEngineVersion).toBe("0.10.0");
    expect(result.agentRuntime?.lastPermissionDecision).toBe("rejected");
    expect(result.agentRuntime?.lastProducedArtifactIds).toEqual([
      "artifact-report"
    ]);
    expect(result.agentRuntime?.pendingApprovalIds).toEqual([
      "approval-source-publication"
    ]);
    expect(result.agentRuntime?.lastSourceChangeSummary?.fileCount).toBe(1);
    expect(result.workspaceHealth?.status).toBe("ready");
  });

  it("accepts portable runtime bootstrap bundles", () => {
    const result = runtimeBootstrapBundleResponseSchema.parse({
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260426-000001",
      nodeId: "worker-it",
      runtimeContext: {
        agentRuntimeContext: {
          engineProfile: {
            defaultAgent: "build",
            displayName: "OpenCode",
            executable: "opencode",
            id: "opencode-default",
            kind: "opencode_server"
          },
          engineProfileRef: "opencode-default",
          mode: "coding_agent"
        },
        artifactContext: {},
        binding: {
          bindingId: "team-alpha-worker-it",
          externalPrincipals: [],
          graphId: "team-alpha",
          graphRevisionId: "team-alpha-20260426-000001",
          node: {
            displayName: "Worker IT",
            nodeId: "worker-it",
            nodeKind: "worker"
          },
          resolvedResourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: [],
            relayProfileRefs: []
          },
          runtimeProfile: "federated",
          schemaVersion: "1"
        },
        generatedAt: "2026-04-26T10:00:00.000Z",
        identityContext: {
          algorithm: "nostr_secp256k1",
          publicKey:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          secretDelivery: {
            envVar: "ENTANGLE_NOSTR_SECRET_KEY",
            mode: "env_var"
          }
        },
        modelContext: {},
        packageManifest: {
          schemaVersion: "1",
          defaultNodeKind: "worker",
          packageKind: "template",
          packageId: "worker-it",
          name: "Worker IT",
          version: "0.1.0"
        },
        policyContext: {
          autonomy: {
            canInitiateSessions: false,
            canMutateGraph: false
          },
          runtimeProfile: "federated"
        },
        relayContext: {},
        schemaVersion: "1",
        workspace: {
          artifactWorkspaceRoot: "/entangle/runtime/workspace/artifacts",
          injectedRoot: "/entangle/runtime/workspace/injected",
          memoryRoot: "/entangle/runtime/workspace/memory",
          packageRoot: "/entangle/runtime/workspace/package",
          retrievalRoot: "/entangle/runtime/workspace/retrieval",
          root: "/entangle/runtime/workspace",
          runtimeRoot: "/entangle/runtime/workspace/runtime"
        }
      },
      schemaVersion: "1",
      snapshots: [
        {
          capturedAt: "2026-04-26T10:00:00.000Z",
          files: [
            {
              contentBase64: "e30=",
              path: "manifest.json",
              sha256:
                "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
              sizeBytes: 2
            }
          ],
          root: "package",
          schemaVersion: "1"
        }
      ]
    });

    expect(result.snapshots[0]?.files[0]?.path).toBe("manifest.json");
    expect(
      runtimeBootstrapBundleResponseSchema.safeParse({
        ...result,
        snapshots: [
          {
            capturedAt: "2026-04-26T10:00:00.000Z",
            files: [
              {
                contentBase64: "e30=",
                path: "../manifest.json",
                sha256:
                  "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
                sizeBytes: 2
              }
            ],
            root: "package",
            schemaVersion: "1"
          }
        ]
      }).success
    ).toBe(false);
  });
});

describe("runtime artifact host API contracts", () => {
  it("accepts a single runtime artifact inspection response", () => {
    const result = runtimeArtifactInspectionResponseSchema.parse({
      artifact: {
        createdAt: "2026-04-24T00:00:00.000Z",
        materialization: {
          localPath: "/tmp/entangle-runner/reports/turn-001.md",
          repoPath: "/tmp/entangle-runner"
        },
        ref: {
          artifactId: "report-turn-001",
          artifactKind: "report_file",
          backend: "git",
          contentSummary: "Turn report",
          conversationId: "conv-alpha",
          createdByNodeId: "worker-it",
          locator: {
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            path: "reports/turn-001.md"
          },
          preferred: true,
          sessionId: "session-alpha",
          status: "materialized"
        },
        turnId: "turn-001",
        updatedAt: "2026-04-24T00:00:00.000Z"
      }
    });

    expect(result.artifact.ref.artifactId).toBe("report-turn-001");
  });

  it("accepts a bounded runtime artifact preview response", () => {
    const result = runtimeArtifactPreviewResponseSchema.parse({
      artifact: {
        createdAt: "2026-04-24T00:00:00.000Z",
        materialization: {
          localPath: "/tmp/entangle-runner/reports/turn-001.md",
          repoPath: "/tmp/entangle-runner"
        },
        ref: {
          artifactId: "report-turn-001",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review",
            commit: "abc123",
            path: "reports/turn-001.md"
          },
          preferred: true,
          status: "materialized"
        },
        updatedAt: "2026-04-24T00:00:00.000Z"
      },
      preview: {
        available: true,
        bytesRead: 24,
        content: "# Turn Report\n\nComplete.",
        contentEncoding: "utf8",
        contentType: "text/markdown",
        sourcePath: "/tmp/entangle-runner/reports/turn-001.md",
        truncated: false
      }
    });

    expect(result.preview.available).toBe(true);
    expect(
      runtimeArtifactPreviewResponseSchema.parse({
        artifact: result.artifact,
        preview: {
          available: true,
          bytesRead: 24,
          content: "# Turn Report\n\nComplete.",
          contentEncoding: "utf8",
          contentType: "text/markdown",
          truncated: false
        }
      }).preview.available
    ).toBe(true);
  });

  it("accepts bounded runtime artifact history and diff responses", () => {
    const artifact = {
      createdAt: "2026-04-24T00:00:00.000Z",
      materialization: {
        repoPath: "/tmp/entangle-runner"
      },
      ref: {
        artifactId: "report-turn-001",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/review",
          commit: "abc123",
          path: "reports/turn-001.md"
        },
        preferred: true,
        status: "materialized"
      },
      updatedAt: "2026-04-24T00:00:00.000Z"
    };

    const history = runtimeArtifactHistoryResponseSchema.parse({
      artifact,
      history: {
        available: true,
        commits: [
          {
            abbreviatedCommit: "abc123",
            authorEmail: "worker@example.test",
            authorName: "worker-it",
            commit: "abc123",
            committedAt: "2026-04-24T00:00:00.000Z",
            subject: "Materialize report"
          }
        ],
        inspectedPath: "reports/turn-001.md",
        truncated: false
      }
    });
    const diff = runtimeArtifactDiffResponseSchema.parse({
      artifact,
      diff: {
        available: true,
        bytesRead: 31,
        content: "diff --git a/report.md b/report.md\n",
        contentEncoding: "utf8",
        contentType: "text/x-diff",
        fromCommit: "base123",
        toCommit: "abc123",
        truncated: false
      }
    });

    expect(history.history.available).toBe(true);
    expect(diff.diff.available).toBe(true);
  });

});

describe("runtime memory host API contracts", () => {
  const memoryPage = {
    kind: "summary",
    path: "wiki/summaries/working-context.md",
    sizeBytes: 128,
    updatedAt: "2026-04-25T12:00:00.000Z"
  };

  it("accepts runtime memory list responses", () => {
    const result = runtimeMemoryInspectionResponseSchema.parse({
      focusedRegisters: [memoryPage],
      memoryRoot: "/tmp/entangle-runner/memory",
      nodeId: "worker-it",
      pages: [memoryPage],
      taskPages: []
    });

    expect(result.focusedRegisters[0]?.path).toBe(
      "wiki/summaries/working-context.md"
    );
  });

  it("accepts bounded runtime memory page previews", () => {
    const result = runtimeMemoryPageInspectionResponseSchema.parse({
      nodeId: "worker-it",
      page: memoryPage,
      preview: {
        available: true,
        bytesRead: 27,
        content: "# Working Context Summary",
        contentEncoding: "utf8",
        contentType: "text/markdown",
        sourcePath:
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
        truncated: false
      }
    });

    expect(result.preview.available).toBe(true);
  });
});

describe("runtime approval host API contracts", () => {
  it("accepts runtime approval list and inspection responses", () => {
    const approval = {
      approvalId: "approval-alpha",
      approverNodeIds: ["supervisor-it"],
      conversationId: "conv-alpha",
      graphId: "team-alpha",
      operation: "source_publication",
      reason: "Supervisor approval is required before publication.",
      requestEventId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestSignerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      requestedAt: "2026-04-24T00:00:00.000Z",
      requestedByNodeId: "worker-it",
      resource: {
        id: "source-history-alpha|gitea|team-alpha|team-alpha",
        kind: "source_history_publication",
        label: "source-history-alpha -> gitea/team-alpha/team-alpha"
      },
      responseEventId:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      responseSignerPubkey:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      sessionId: "session-alpha",
      sourceMessageId:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      status: "approved",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };

    expect(
      runtimeApprovalListResponseSchema.parse({ approvals: [approval] }).approvals
    ).toHaveLength(1);
    expect(
      runtimeApprovalInspectionResponseSchema.parse({ approval }).approval.status
    ).toBe("approved");
    expect(
      runtimeApprovalInspectionResponseSchema.parse({ approval }).approval.operation
    ).toBe("source_publication");
    expect(
      runtimeApprovalInspectionResponseSchema.parse({ approval }).approval.resource
        ?.kind
    ).toBe("source_history_publication");
    expect(
      runtimeApprovalInspectionResponseSchema.parse({
        approval: {
          ...approval,
          approvalId: "approval-wiki-publication",
          operation: "wiki_update",
          resource: {
            id: "worker-it|gitea|team-alpha|wiki-public",
            kind: "wiki_repository_publication",
            label: "worker-it wiki -> gitea/team-alpha/wiki-public"
          }
        }
      }).approval.resource?.kind
    ).toBe("wiki_repository_publication");
    expect(
      runtimeApprovalInspectionResponseSchema.parse({ approval }).approval
        .responseSignerPubkey
    ).toBe("dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");
  });

});

describe("runtime turn host API contracts", () => {
  it("accepts runtime turn list and inspection responses", () => {
    const turn = {
      consumedArtifactIds: [],
      graphId: "team-alpha",
      nodeId: "worker-it",
      phase: "emitting",
      producedArtifactIds: [],
      startedAt: "2026-04-24T00:00:00.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };

    expect(runtimeTurnListResponseSchema.parse({ turns: [turn] }).turns).toHaveLength(
      1
    );
    expect(runtimeTurnInspectionResponseSchema.parse({ turn }).turn.turnId).toBe(
      "turn-alpha"
    );
  });
});

describe("source change candidate host API contracts", () => {
  it("accepts source change candidate list and inspection responses", () => {
    const candidate = {
      candidateId: "source-change-turn-alpha",
      createdAt: "2026-04-24T00:01:00.000Z",
      graphId: "team-alpha",
      nodeId: "worker-it",
      sourceChangeSummary: {
        additions: 2,
        checkedAt: "2026-04-24T00:01:00.000Z",
        deletions: 1,
        fileCount: 1,
        files: [
          {
            additions: 2,
            deletions: 1,
            path: "src/index.ts",
            status: "modified"
          }
        ],
        status: "changed"
      },
      snapshot: {
        baseTree: "base-tree-alpha",
        headTree: "head-tree-alpha",
        kind: "shadow_git_tree"
      },
      status: "pending_review",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:01:00.000Z"
    };

    expect(
      runtimeSourceChangeCandidateListResponseSchema.parse({
        candidates: [candidate]
      }).candidates
    ).toHaveLength(1);
    expect(
      runtimeSourceChangeCandidateInspectionResponseSchema.parse({
        candidate
      }).candidate.status
    ).toBe("pending_review");
    expect(
      runtimeSourceChangeCandidateInspectionResponseSchema.parse({
        candidate: {
          ...candidate,
          review: {
            decidedAt: "2026-04-24T00:02:00.000Z",
            decidedBy: "operator-alpha",
            decision: "rejected",
            reason: "The generated source is not wanted."
          },
          status: "rejected",
          updatedAt: "2026-04-24T00:02:00.000Z"
        }
      }).candidate.review?.decision
    ).toBe("rejected");
    const historyEntry = {
      appliedAt: "2026-04-24T00:03:00.000Z",
      appliedBy: "operator-alpha",
      applicationApprovalId: "approval-source-apply-alpha",
      baseTree: "base-tree-alpha",
      branch: "entangle-source-history",
      candidateId: "source-change-turn-alpha",
      commit: "commit-alpha",
      graphId: "team-alpha",
      graphRevisionId: "team-alpha-20260424-000000",
      headTree: "head-tree-alpha",
      mode: "already_in_workspace",
      nodeId: "worker-it",
      publication: {
        approvalId: "approval-source-publish-alpha",
        artifactId: "source-source-history-source-change-turn-alpha",
        branch: "worker-it/source-history/source-history-source-change-turn-alpha",
        publication: {
          publishedAt: "2026-04-24T00:04:00.000Z",
          remoteName: "entangle-gitea",
          remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
          state: "published"
        },
        requestedAt: "2026-04-24T00:04:00.000Z",
        requestedBy: "operator-alpha",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "graph-alpha"
      },
      reason: "Accepted for the source history.",
      sourceChangeSummary: candidate.sourceChangeSummary,
      sourceHistoryId: "source-history-source-change-turn-alpha",
      turnId: "turn-alpha",
      updatedAt: "2026-04-24T00:03:00.000Z"
    };

    expect(
      runtimeSourceHistoryListResponseSchema.parse({
        history: [historyEntry]
      }).history
    ).toHaveLength(1);
    expect(
      runtimeSourceHistoryInspectionResponseSchema.parse({
        entry: historyEntry
      }).entry.mode
    ).toBe("already_in_workspace");
    expect(
      runtimeSourceHistoryPublishRequestSchema.parse({
        approvalId: "approval-source-publish-alpha",
        reason: "Publish to the public source-history repository.",
        requestedBy: "operator-alpha",
        retryFailedPublication: true,
        target: {
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha-public"
        }
      }).target?.repositoryName
    ).toBe("graph-alpha-public");
    expect(
      runtimeWikiPublishRequestSchema.parse({
        reason: "Publish wiki to a shared repository.",
        requestedBy: "operator-alpha",
        retryFailedPublication: true,
        target: {
          repositoryName: "wiki-public"
        }
      }).target?.repositoryName
    ).toBe("wiki-public");
    expect(
      runtimeSourceChangeCandidateInspectionResponseSchema.parse({
        candidate: {
          ...candidate,
          application: {
            approvalId: "approval-source-apply-alpha",
            appliedAt: "2026-04-24T00:03:00.000Z",
            appliedBy: "operator-alpha",
            commit: "commit-alpha",
            mode: "already_in_workspace",
            reason: "Accepted for the source history.",
            sourceHistoryId: "source-history-source-change-turn-alpha"
          },
          review: {
            decidedAt: "2026-04-24T00:02:00.000Z",
            decidedBy: "operator-alpha",
            decision: "accepted"
          },
          status: "accepted",
          updatedAt: "2026-04-24T00:03:00.000Z"
        }
      }).candidate.application?.sourceHistoryId
    ).toBe("source-history-source-change-turn-alpha");
    expect(
      runtimeSourceChangeCandidateDiffResponseSchema.parse({
        candidate,
        diff: {
          available: true,
          bytesRead: 42,
          content:
            "diff --git a/src/index.ts b/src/index.ts\n+export const value = true;\n",
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          truncated: false
        }
      }).diff.available
    ).toBe(true);
    expect(
      runtimeSourceChangeCandidateFilePreviewResponseSchema.parse({
        candidate,
        path: "src/index.ts",
        preview: {
          available: true,
          bytesRead: 27,
          content: "export const value = true;\n",
          contentEncoding: "utf8",
          contentType: "text/plain",
          truncated: false
        }
      }).path
    ).toBe("src/index.ts");
  });
});

describe("Entangle A2A machine-readable contracts", () => {
  it("accepts a valid task request payload", () => {
    const result = entangleA2AMessageSchema.parse({
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "review_patch",
      messageType: "task.request",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "reviewer-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-001",
      work: {
        summary: "Review the parser patch for blocking issues."
      }
    });

    expect(result.messageType).toBe("task.request");
  });

  it("rejects invalid follow-up semantics for conversation.close", () => {
    const result = entangleA2AMessageSchema.safeParse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "close_conversation",
      messageType: "conversation.close",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "reviewer-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-002",
      work: {
        summary: "No more follow-up is required."
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts read receipt messages with parent message context", () => {
    const result = entangleA2AMessageSchema.parse({
      conversationId: "conv-alpha",
      fromNodeId: "user-main",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "read_receipt",
      messageType: "read.receipt",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-alpha",
      toNodeId: "worker-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-read",
      work: {
        summary: "Read conversation conv-alpha."
      }
    });

    expect(result.messageType).toBe("read.receipt");
  });

  it("rejects response-required messages with no allowed follow-up", () => {
    const result = entangleA2AMessageSchema.safeParse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-alpha",
      fromNodeId: "worker-it",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "handoff_review",
      messageType: "task.handoff",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 0,
        responseRequired: true
      },
      sessionId: "session-alpha",
      toNodeId: "reviewer-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-003",
      work: {
        summary: "Review the produced artifact."
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts approval request and response metadata contracts", () => {
    expect(
      entangleA2AApprovalRequestMetadataSchema.parse({
        approval: {
          approvalId: "approval-alpha",
          approverNodeIds: ["lead-it"],
          operation: "artifact_publication",
          resource: {
            id: "artifact-alpha",
            kind: "artifact"
          },
          reason: "Approve publication before the session can complete."
        }
      })
    ).toEqual({
      approval: {
        approvalId: "approval-alpha",
        approverNodeIds: ["lead-it"],
        operation: "artifact_publication",
        resource: {
          id: "artifact-alpha",
          kind: "artifact"
        },
        reason: "Approve publication before the session can complete."
      }
    });

    expect(
      entangleA2AApprovalResponseMetadataSchema.parse({
        approval: {
          approvalId: "approval-alpha",
          decision: "approved"
        }
      }).approval.decision
    ).toBe("approved");
  });

  it("accepts source-change review messages with parent context", () => {
    const message = entangleA2AMessageSchema.parse({
      constraints: {
        approvalRequiredBeforeAction: false
      },
      conversationId: "conv-source-review",
      fromNodeId: "user-main",
      fromPubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      graphId: "graph-alpha",
      intent: "review_source_change",
      messageType: "source_change.review",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocol: "entangle.a2a.v1",
      responsePolicy: {
        closeOnResult: false,
        maxFollowups: 0,
        responseRequired: false
      },
      sessionId: "session-source-review",
      toNodeId: "worker-it",
      toPubkey: "2222222222222222222222222222222222222222222222222222222222222222",
      turnId: "turn-source-review",
      work: {
        metadata: {
          sourceChangeReview: {
            candidateId: "source-change-turn-alpha",
            decision: "accepted",
            reason: "The candidate is ready for approval."
          }
        },
        summary: "Accepted source change source-change-turn-alpha."
      }
    });

    expect(message.messageType).toBe("source_change.review");
    expect(
      entangleA2ASourceChangeReviewMetadataSchema.parse(
        message.work.metadata
      ).sourceChangeReview.decision
    ).toBe("accepted");
    expect(
      userNodeMessagePublishRequestSchema.parse({
        conversationId: "conv-source-review",
        messageType: "source_change.review",
        parentMessageId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        sessionId: "session-source-review",
        sourceChangeReview: {
          candidateId: "source-change-turn-alpha",
          decision: "accepted"
        },
        summary: "Accepted source change source-change-turn-alpha.",
        targetNodeId: "worker-it",
        turnId: "turn-source-review"
      }).sourceChangeReview?.candidateId
    ).toBe("source-change-turn-alpha");
  });
});

describe("agent engine turn contracts", () => {
  it("accepts topology-addressed handoff directives with canonical defaults", () => {
    const result = agentEngineTurnResultSchema.parse({
      assistantMessages: ["Prepared a delegated review artifact."],
      handoffDirectives: [
        {
          summary: "Review the produced artifact.",
          targetNodeId: "reviewer-it"
        }
      ],
      stopReason: "completed"
    });

    expect(result.handoffDirectives[0]).toMatchObject({
      includeArtifacts: "produced",
      responsePolicy: {
        closeOnResult: true,
        maxFollowups: 1,
        responseRequired: true
      },
      targetNodeId: "reviewer-it"
    });
  });

  it("rejects handoff directives without an edge or target", () => {
    const result = agentEngineTurnResultSchema.safeParse({
      assistantMessages: ["Prepared a delegated review artifact."],
      handoffDirectives: [
        {
          summary: "Review the produced artifact."
        }
      ],
      stopReason: "completed"
    });

    expect(result.success).toBe(false);
  });

  it("accepts policy-scoped approval request directives", () => {
    const result = agentEngineTurnResultSchema.parse({
      approvalRequestDirectives: [
        {
          approvalId: "approval-source-publication-alpha",
          approverNodeIds: ["operator-alpha"],
          operation: "source_publication",
          reason: "Approve source publication before pushing shared history.",
          resource: {
            id: "source-history-alpha",
            kind: "source_history",
            label: "source-history-alpha"
          }
        }
      ],
      assistantMessages: ["Prepared source history and requested approval."],
      stopReason: "completed"
    });

    expect(result.approvalRequestDirectives[0]).toMatchObject({
      approvalId: "approval-source-publication-alpha",
      approverNodeIds: ["operator-alpha"],
      operation: "source_publication",
      resource: {
        id: "source-history-alpha",
        kind: "source_history"
      }
    });
  });

  it("accepts cancelled engine outcomes with bounded cancellation failure evidence", () => {
    const result = agentEngineTurnResultSchema.parse({
      assistantMessages: ["The turn was cancelled before completion."],
      failure: {
        classification: "cancelled",
        message: "Session cancellation was requested by the operator."
      },
      stopReason: "cancelled",
      toolExecutions: [],
      toolRequests: []
    });

    expect(result.stopReason).toBe("cancelled");
    expect(result.failure?.classification).toBe("cancelled");
  });

  it("rejects approval request directives without an operation", () => {
    const result = agentEngineTurnResultSchema.safeParse({
      approvalRequestDirectives: [
        {
          reason: "Approve the action before continuing."
        }
      ],
      assistantMessages: ["Requested approval."],
      stopReason: "completed"
    });

    expect(result.success).toBe(false);
  });
});

describe("artifact contracts", () => {
  it("accepts a structured git artifact record", () => {
    const result = artifactRecordSchema.parse({
      createdAt: "2026-04-22T00:00:00.000Z",
      materialization: {
        localPath: "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md",
        repoPath: "/tmp/entangle-runner/workspace"
      },
      publication: {
        state: "not_requested"
      },
      ref: {
        artifactId: "report-turn-001",
        artifactKind: "report_file",
        backend: "git",
        contentSummary: "Turn report for the parser review.",
        conversationId: "conv-alpha",
        createdByNodeId: "worker-it",
        locator: {
          branch: "worker-it/session-alpha/review-patch",
          commit: "abc123",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/turn-001.md"
        },
        preferred: true,
        sessionId: "session-alpha",
        status: "materialized"
      },
      turnId: "turn-001",
      updatedAt: "2026-04-22T00:00:00.000Z"
    });

    expect(result.ref.backend).toBe("git");
    expect(result.ref.locator.path).toContain("reports/session-alpha");
    expect(result.publication?.state).toBe("not_requested");
  });

  it("rejects published artifact metadata that omits remote publication details", () => {
    expect(
      artifactRecordSchema.safeParse({
        createdAt: "2026-04-22T00:00:00.000Z",
        materialization: {
          localPath: "/tmp/entangle-runner/workspace/reports/session-alpha/turn-001.md"
        },
        publication: {
          state: "published",
          publishedAt: "2026-04-22T00:01:00.000Z"
        },
        ref: {
          artifactId: "report-turn-001",
          artifactKind: "report_file",
          backend: "git",
          locator: {
            branch: "worker-it/session-alpha/review-patch",
            commit: "abc123",
            gitServiceRef: "gitea",
            namespace: "team-alpha",
            repositoryName: "graph-alpha",
            path: "reports/session-alpha/turn-001.md"
          },
          preferred: true,
          status: "published"
        },
        updatedAt: "2026-04-22T00:01:00.000Z"
      }).success
    ).toBe(false);
  });

  it("accepts retrieval metadata for successfully consumed git artifacts", () => {
    const result = artifactRecordSchema.parse({
      createdAt: "2026-04-23T00:00:00.000Z",
      materialization: {
        localPath:
          "/tmp/entangle-runner/retrieval-cache/input-report/repo/reports/session-alpha/turn-001.md",
        repoPath: "/tmp/entangle-runner/retrieval-cache/input-report/repo"
      },
      ref: {
        artifactId: "input-report",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "worker-it/session-alpha/review-patch",
          commit: "abc123",
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "graph-alpha",
          path: "reports/session-alpha/turn-001.md"
        },
        preferred: true,
        status: "published"
      },
      retrieval: {
        state: "retrieved",
        retrievedAt: "2026-04-23T00:00:01.000Z",
        remoteName: "entangle-gitea",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git"
      },
      updatedAt: "2026-04-23T00:00:01.000Z"
    });

    expect(result.retrieval?.state).toBe("retrieved");
  });
});

describe("focused register state contracts", () => {
  it("accepts persisted focused-register carry state", () => {
    const result = focusedRegisterStateSchema.parse({
      registers: {
        nextActions: [
          {
            carryCount: 2,
            firstObservedTurnId: "turn-001",
            lastObservedTurnId: "turn-002",
            normalizedKey: "confirm the next relay checkpoint",
            text: "Confirm the next relay checkpoint."
          }
        ],
        openQuestions: [],
        resolutions: [
          {
            carryCount: 1,
            firstObservedTurnId: "turn-002",
            lastObservedTurnId: "turn-002",
            normalizedKey: "the prior alert-routing concern is closed",
            text: "The prior alert-routing concern is closed."
          }
        ]
      },
      schemaVersion: "1",
      updatedAt: "2026-04-24T00:00:00.000Z",
      updatedTurnId: "turn-002"
    });

    expect(result.registers.nextActions[0]?.carryCount).toBe(2);
    expect(result.registers.resolutions).toHaveLength(1);
    expect(result.transitionHistory).toEqual([]);
  });

  it("accepts persisted focused-register transition history", () => {
    const result = focusedRegisterStateSchema.parse({
      registers: {
        nextActions: [],
        openQuestions: [],
        resolutions: []
      },
      schemaVersion: "1",
      transitionHistory: [
        {
          kind: "replaced",
          observedAt: "2026-04-24T00:01:00.000Z",
          register: "openQuestions",
          resolutionTexts: [],
          sourceTexts: ["Will the relay recovery trace remain readable?"],
          targetTexts: [
            "Which relay recovery trace fields still need operator review?"
          ],
          turnId: "turn-003"
        }
      ],
      updatedAt: "2026-04-24T00:01:00.000Z",
      updatedTurnId: "turn-003"
    });

    expect(result.transitionHistory[0]?.kind).toBe("replaced");
    expect(result.transitionHistory[0]?.register).toBe("openQuestions");
  });
});

describe("external principal contracts", () => {
  it("accepts a git external principal record", () => {
    const result = externalPrincipalRecordSchema.parse({
      principalId: "worker-it-git",
      displayName: "Worker IT Git Principal",
      systemKind: "git",
      gitServiceRef: "gitea",
      subject: "worker-it",
      transportAuthMode: "ssh_key",
      secretRef: "secret://git/worker-it/ssh",
      attribution: {
        displayName: "Worker IT",
        email: "worker-it@entangle.example"
      },
      signing: {
        mode: "none"
      }
    });

    expect(result.systemKind).toBe("git");
    expect(result.gitServiceRef).toBe("gitea");
  });

  it("accepts an external principal deletion response", () => {
    const result = externalPrincipalDeletionResponseSchema.parse({
      deletedPrincipalId: "worker-it-git"
    });

    expect(result.deletedPrincipalId).toBe("worker-it-git");
  });
});

describe("host event contracts", () => {
  it("normalizes host event list query filters", () => {
    expect(
      hostEventListQuerySchema.parse({
        category: "security",
        limit: "25",
        nodeId: "worker-it",
        operatorId: "ops-lead",
        statusCode: "403",
        typePrefix: ["host.operator_request.", "runtime."]
      })
    ).toEqual({
      category: "security",
      limit: 25,
      nodeId: "worker-it",
      operatorId: "ops-lead",
      statusCode: 403,
      typePrefix: ["host.operator_request.", "runtime."]
    });

    expect(
      hostEventListQuerySchema.parse({
        typePrefix: "session."
      })
    ).toEqual({
      typePrefix: ["session."]
    });
  });

  it("accepts a typed bootstrap operator request audit event", () => {
    const result = hostEventRecordSchema.parse({
      authMode: "bootstrap_operator_token",
      category: "security",
      eventId: "host-operator-request-001",
      message:
        "Host operator request 'PUT /v1/external-principals/worker-it-git' completed with status 200.",
      method: "PUT",
      operatorId: "ops-lead",
      operatorPermissions: ["host.admin"],
      operatorRole: "admin",
      path: "/v1/external-principals/worker-it-git",
      requestId: "req-1",
      schemaVersion: "1",
      statusCode: 200,
      timestamp: "2026-04-24T00:00:00.000Z",
      type: "host.operator_request.completed"
    });

    expect(result.type).toBe("host.operator_request.completed");
    expect(result.category).toBe("security");
    expect(result.operatorId).toBe("ops-lead");
    expect(result.operatorPermissions).toEqual(["host.admin"]);
    expect(result.operatorRole).toBe("admin");
  });

  it("accepts a typed runtime observed-state event", () => {
    const result = hostEventRecordSchema.parse({
      eventId: "runtime-worker-it-evt-001",
      message: "Runtime 'worker-it' entered the running state.",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      backendKind: "docker",
      category: "runtime",
      desiredState: "running",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      nodeId: "worker-it",
      observedState: "running",
      previousObservedState: "starting",
      statusMessage: "Runtime is healthy.",
      type: "runtime.observed_state.changed"
    });

    expect(result.type).toBe("runtime.observed_state.changed");
    expect(result.category).toBe("runtime");
  });

  it("accepts a typed runtime restart-requested event", () => {
    const result = hostEventRecordSchema.parse({
      category: "runtime",
      eventId: "runtime-worker-it-restart-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' restart was requested with generation '1'.",
      nodeId: "worker-it",
      previousRestartGeneration: 0,
      restartGeneration: 1,
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "runtime.restart.requested"
    });

    expect(result.type).toBe("runtime.restart.requested");
    expect(result.restartGeneration).toBe(1);
  });

  it("accepts a typed runtime assignment receipt event", () => {
    const result = hostEventRecordSchema.parse({
      assignmentId: "assignment-alpha",
      category: "runtime",
      eventId: "runtime-assignment-receipt-001",
      hostAuthorityPubkey: authorityPubkey,
      message:
        "Assignment 'assignment-alpha' reported receipt 'started' from runner 'runner-alpha'.",
      observedAt,
      receiptKind: "started",
      receiptMessage: "Assignment runtime is running.",
      runnerId: "runner-alpha",
      runnerPubkey,
      schemaVersion: "1",
      timestamp: observedAt,
      type: "runtime.assignment.receipt"
    });

    expect(result.type).toBe("runtime.assignment.receipt");
    expect(result.receiptKind).toBe("started");
  });

  it("accepts a typed runtime command receipt event", () => {
    const result = hostEventRecordSchema.parse({
      artifactId: "artifact-alpha",
      assignmentId: "assignment-alpha",
      cancellationId: "cancel-alpha",
      candidateId: "artifact-proposal-alpha",
      category: "runtime",
      commandEventType: "runtime.artifact.propose_source_change",
      commandId: "cmd-artifact-proposal-alpha",
      eventId: "runtime-command-receipt-001",
      graphId: "team-alpha",
      hostAuthorityPubkey: authorityPubkey,
      message:
        "Runtime command 'cmd-artifact-proposal-alpha' reported 'completed' from runner 'runner-alpha'.",
      nodeId: "worker-it",
      observedAt,
      proposalId: "artifact-proposal-alpha",
      receiptMessage: "Artifact produced a source-change proposal.",
      receiptStatus: "completed",
      runnerId: "runner-alpha",
      runnerPubkey,
      schemaVersion: "1",
      sessionId: "session-alpha",
      targetPath: "proposals/report.md",
      timestamp: observedAt,
      type: "runtime.command.receipt",
      wikiPageExpectedSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      wikiPageNextSha256:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      wikiPagePreviousSha256:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      wikiPagePath: "operator/notes.md"
    });

    expect(result.type).toBe("runtime.command.receipt");
    expect(result.receiptStatus).toBe("completed");
    expect(result.sessionId).toBe("session-alpha");
    expect(result.candidateId).toBe("artifact-proposal-alpha");
    expect(result.wikiPagePreviousSha256).toBe(
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    );
    expect(result.wikiPagePath).toBe("operator/notes.md");
  });

  it("accepts a typed external-principal deleted event", () => {
    const result = hostEventRecordSchema.parse({
      category: "control_plane",
      eventId: "external-principal-worker-it-deleted-001",
      message: "Deleted external principal 'worker-it-git'.",
      principalId: "worker-it-git",
      schemaVersion: "1",
      timestamp: "2026-04-24T00:00:00.000Z",
      type: "external_principal.deleted"
    });

    expect(result.type).toBe("external_principal.deleted");
    expect(result.category).toBe("control_plane");
    expect(result.principalId).toBe("worker-it-git");
  });

  it("accepts a typed runtime recovery-policy-updated event", () => {
    const result = hostEventRecordSchema.parse({
      category: "runtime",
      eventId: "runtime-worker-it-recovery-policy-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' recovery policy is now 'restart_on_failure'.",
      nodeId: "worker-it",
      policy: {
        cooldownSeconds: 30,
        maxAttempts: 3,
        mode: "restart_on_failure"
      },
      previousPolicy: {
        mode: "manual"
      },
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "runtime.recovery_policy.updated"
    });

    expect(result.type).toBe("runtime.recovery_policy.updated");
    expect(result).toMatchObject({
      policy: {
        mode: "restart_on_failure"
      }
    });
  });

  it("accepts session-level consistency findings without conversation ids", () => {
    const finding = hostSessionConsistencyFindingSchema.parse({
      code: "active_session_without_open_conversations",
      message:
        "Session 'session-alpha' on node 'worker-it' is active but has no active conversation ids and no open conversation records.",
      nodeId: "worker-it",
      severity: "warning"
    });

    expect(finding).toEqual({
      code: "active_session_without_open_conversations",
      message:
        "Session 'session-alpha' on node 'worker-it' is active but has no active conversation ids and no open conversation records.",
      nodeId: "worker-it",
      severity: "warning"
    });
  });

  it("accepts approval-level consistency findings with approval ids", () => {
    const finding = hostSessionConsistencyFindingSchema.parse({
      approvalId: "approval-alpha",
      code: "waiting_approval_missing_record",
      message:
        "Session 'session-alpha' on node 'worker-it' references waiting approval 'approval-alpha', but no approval record exists.",
      nodeId: "worker-it",
      severity: "error"
    });

    expect(finding).toEqual({
      approvalId: "approval-alpha",
      code: "waiting_approval_missing_record",
      message:
        "Session 'session-alpha' on node 'worker-it' references waiting approval 'approval-alpha', but no approval record exists.",
      nodeId: "worker-it",
      severity: "error"
    });
  });

  it("accepts approval lifecycle counts on host session summaries", () => {
    const summary = hostSessionSummarySchema.parse({
      activeConversationIds: [],
      approvalStatusCounts: {
        approved: 1,
        expired: 0,
        not_required: 0,
        pending: 2,
        rejected: 0,
        withdrawn: 0
      },
      graphId: "graph-alpha",
      nodeIds: ["worker-it"],
      nodeStatuses: [
        {
          nodeId: "worker-it",
          status: "waiting_approval"
        }
      ],
      rootArtifactIds: [],
      sessionId: "session-alpha",
      traceIds: ["trace-alpha"],
      updatedAt: "2026-04-24T00:00:00.000Z",
      waitingApprovalIds: ["approval-alpha", "approval-beta"]
    });

    expect(summary.approvalStatusCounts?.pending).toBe(2);
    expect(summary.approvalStatusCounts?.approved).toBe(1);
  });

  it("accepts typed runtime recovery-recorded and controller-updated events", () => {
    const recordedEvent = hostEventRecordSchema.parse({
      category: "runtime",
      desiredState: "running",
      eventId: "runtime-worker-it-recovery-recorded-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      lastError: "Injected runtime failure.",
      message: "Runtime 'worker-it' recorded a recovery snapshot in observed state 'failed'.",
      nodeId: "worker-it",
      observedState: "failed",
      recordedAt: "2026-04-23T00:01:00.000Z",
      recoveryId: "worker-it-20260423t000100-abcdef123456",
      restartGeneration: 1,
      schemaVersion: "1",
      timestamp: "2026-04-23T00:01:00.000Z",
      type: "runtime.recovery.recorded"
    });
    const controllerEvent = hostEventRecordSchema.parse({
      category: "runtime",
      controller: {
        activeFailureFingerprint: "fp-worker-it",
        attemptsUsed: 1,
        graphId: "graph-alpha",
        graphRevisionId: "graph-alpha-20260423-000000",
        lastAttemptedAt: "2026-04-23T00:02:00.000Z",
        lastFailureAt: "2026-04-23T00:02:00.000Z",
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "cooldown",
        updatedAt: "2026-04-23T00:02:00.000Z"
      },
      eventId: "runtime-worker-it-recovery-controller-001",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260423-000000",
      message: "Runtime 'worker-it' recovery controller is now 'cooldown'.",
      nodeId: "worker-it",
      previousAttemptsUsed: 0,
      previousState: "manual_required",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:02:00.000Z",
      type: "runtime.recovery_controller.updated"
    });

    expect(recordedEvent.type).toBe("runtime.recovery.recorded");
    expect(recordedEvent.observedState).toBe("failed");
    if (controllerEvent.type !== "runtime.recovery_controller.updated") {
      throw new Error("Expected runtime.recovery_controller.updated event");
    }

    expect(controllerEvent.controller.state).toBe("cooldown");
  });

  it("accepts typed session and runner-turn activity events", () => {
    const sessionEvent = hostEventRecordSchema.parse({
      activeConversationIds: ["conv-alpha"],
      approvalStatusCounts: {
        approved: 0,
        expired: 0,
        not_required: 0,
        pending: 1,
        rejected: 0,
        withdrawn: 0
      },
      category: "session",
      conversationStatusCounts: {
        acknowledged: 0,
        awaiting_approval: 0,
        blocked: 0,
        closed: 0,
        expired: 0,
        opened: 0,
        rejected: 0,
        resolved: 0,
        working: 1
      },
      eventId: "session-worker-it-001",
      graphId: "graph-alpha",
      lastMessageType: "task.result",
      message: "Session 'session-alpha' on node 'worker-it' is now 'active'.",
      nodeId: "worker-it",
      ownerNodeId: "worker-it",
      rootArtifactIds: ["artifact-report-001"],
      schemaVersion: "1",
      sessionConsistencyFindingCodes: [
        "open_conversation_missing_active_reference"
      ],
      sessionConsistencyFindingCount: 1,
      sessionId: "session-alpha",
      status: "active",
      timestamp: "2026-04-24T00:00:00.000Z",
      traceId: "trace-alpha",
      type: "session.updated",
      updatedAt: "2026-04-24T00:00:00.000Z"
    });
    const runnerTurnEvent = hostEventRecordSchema.parse({
      category: "runner",
      consumedArtifactIds: ["artifact-inbound-001"],
      conversationId: "conv-alpha",
      engineOutcome: {
        providerMetadata: {
          adapterKind: "anthropic",
          modelId: "claude-opus-4-7",
          profileId: "shared-anthropic"
        },
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_alpha",
            toolId: "inspect_artifact_input"
          }
        ],
        usage: {
          inputTokens: 42,
          outputTokens: 12
        }
      },
      engineRequestSummary: {
        actionContractContextIncluded: true,
        agentRuntimeContextIncluded: true,
        artifactInputCount: 1,
        artifactRefCount: 1,
        executionLimits: {
          maxOutputTokens: 4096,
          maxToolTurns: 8
        },
        generatedAt: "2026-04-24T00:00:01.000Z",
        inboundMessageContextIncluded: true,
        interactionPromptCharacterCount: 840,
        interactionPromptPartCount: 7,
        memoryRefCount: 6,
        peerRouteContextIncluded: true,
        policyContextIncluded: true,
        systemPromptCharacterCount: 220,
        systemPromptPartCount: 4,
        toolDefinitionCount: 3,
        workspaceBoundaryContextIncluded: true
      },
      memorySynthesisOutcome: {
        status: "succeeded",
        updatedAt: "2026-04-24T00:00:01.000Z",
        updatedSummaryPagePaths: [
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
          "/tmp/entangle-runner/memory/wiki/summaries/decisions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/stable-facts.md",
          "/tmp/entangle-runner/memory/wiki/summaries/open-questions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/next-actions.md",
          "/tmp/entangle-runner/memory/wiki/summaries/resolutions.md"
        ],
        workingContextPagePath:
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md"
      },
      memoryRepositorySyncOutcome: {
        branch: "entangle-wiki",
        changedFileCount: 6,
        commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        status: "committed",
        syncedAt: "2026-04-24T00:00:01.000Z"
      },
      eventId: "turn-worker-it-001",
      graphId: "graph-alpha",
      message: "Runner turn 'turn-alpha' on node 'worker-it' is now in phase 'persisting'.",
      nodeId: "worker-it",
      phase: "persisting",
      producedArtifactIds: ["artifact-report-001"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      sourceChangeCandidateIds: ["source-change-turn-alpha"],
      sourceChangeSummary: {
        additions: 9,
        checkedAt: "2026-04-24T00:00:01.000Z",
        deletions: 2,
        fileCount: 1,
        files: [
          {
            additions: 9,
            deletions: 2,
            path: "src/worker.ts",
            status: "modified"
          }
        ],
        status: "changed"
      },
      startedAt: "2026-04-24T00:00:00.000Z",
      timestamp: "2026-04-24T00:00:01.000Z",
      triggerKind: "message",
      turnId: "turn-alpha",
      type: "runner.turn.updated",
      updatedAt: "2026-04-24T00:00:01.000Z"
    });
    const sourceHistoryEvent = hostEventRecordSchema.parse({
      approvalId: "approval-source-apply-alpha",
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "commit-alpha",
      eventId: "evt-source-history-updated",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260424-000000",
      historyId: "source-history-source-change-turn-alpha",
      message:
        "Source history 'source-history-source-change-turn-alpha' for runtime 'worker-it' recorded candidate 'source-change-turn-alpha' at commit 'commit-alpha'.",
      mode: "already_in_workspace",
      nodeId: "worker-it",
      schemaVersion: "1",
      sourceHistoryRef: "refs/heads/entangle-source-history",
      timestamp: "2026-04-24T00:00:03.000Z",
      turnId: "turn-alpha",
      type: "source_history.updated"
    });
    const sourceHistoryPublishedEvent = hostEventRecordSchema.parse({
      artifactId: "source-source-history-source-change-turn-alpha",
      approvalId: "approval-source-publish-alpha",
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "artifact-commit-alpha",
      eventId: "evt-source-history-published",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260424-000000",
      historyId: "source-history-source-change-turn-alpha",
      message:
        "Source history 'source-history-source-change-turn-alpha' for runtime 'worker-it' published artifact 'source-source-history-source-change-turn-alpha'.",
      nodeId: "worker-it",
      publicationState: "published",
      remoteName: "entangle-gitea",
      remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
      schemaVersion: "1",
      sourceHistoryBranch:
        "worker-it/source-history/source-history-source-change-turn-alpha",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha",
      timestamp: "2026-04-24T00:00:04.000Z",
      turnId: "turn-alpha",
      type: "source_history.published"
    });
    const sourceHistoryReplayedEvent = hostEventRecordSchema.parse({
      approvalId: "approval-source-replay-alpha",
      candidateId: "source-change-turn-alpha",
      category: "runtime",
      commit: "commit-alpha",
      eventId: "evt-source-history-replayed",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260424-000000",
      historyId: "source-history-source-change-turn-alpha",
      message:
        "Source history 'source-history-source-change-turn-alpha' for runtime 'worker-it' replayed into the source workspace.",
      nodeId: "worker-it",
      replayId: "replay-source-history-alpha",
      replayStatus: "replayed",
      schemaVersion: "1",
      timestamp: "2026-04-24T00:00:05.000Z",
      turnId: "turn-alpha",
      type: "source_history.replayed"
    });
    const wikiRepositoryPublishedEvent = hostEventRecordSchema.parse({
      artifactId: "wiki-repository-worker-it-wiki-commit",
      branch: "worker-it/wiki-repository/entangle-wiki",
      category: "runtime",
      commit: "wiki-commit-alpha",
      eventId: "evt-wiki-repository-published",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260424-000000",
      message:
        "Wiki repository for runtime 'worker-it' published artifact 'wiki-repository-worker-it-wiki-commit'.",
      nodeId: "worker-it",
      publicationId: "wiki-publication-alpha",
      publicationState: "published",
      remoteName: "entangle-gitea",
      remoteUrl: "ssh://git@gitea.example:22/team-alpha/graph-alpha.git",
      schemaVersion: "1",
      targetGitServiceRef: "gitea",
      targetNamespace: "team-alpha",
      targetRepositoryName: "graph-alpha",
      timestamp: "2026-04-24T00:00:06.000Z",
      type: "wiki_repository.published"
    });

    expect(sessionEvent.type).toBe("session.updated");
    expect(sessionEvent.category).toBe("session");
    if (sessionEvent.type !== "session.updated") {
      throw new Error("Expected session.updated event");
    }
    expect(sessionEvent.activeConversationIds).toEqual(["conv-alpha"]);
    expect(sessionEvent.rootArtifactIds).toEqual(["artifact-report-001"]);
    expect(sessionEvent.lastMessageType).toBe("task.result");
    expect(sessionEvent.approvalStatusCounts?.pending).toBe(1);
    expect(sessionEvent.conversationStatusCounts?.working).toBe(1);
    expect(sessionEvent.sessionConsistencyFindingCount).toBe(1);
    expect(sessionEvent.sessionConsistencyFindingCodes).toEqual([
      "open_conversation_missing_active_reference"
    ]);
    expect(runnerTurnEvent.type).toBe("runner.turn.updated");
    expect(runnerTurnEvent.category).toBe("runner");
    if (runnerTurnEvent.type !== "runner.turn.updated") {
      throw new Error("Expected runner.turn.updated event");
    }
    expect(runnerTurnEvent.engineOutcome?.toolExecutions).toHaveLength(1);
    expect(runnerTurnEvent.memorySynthesisOutcome?.status).toBe("succeeded");
    expect(runnerTurnEvent.memorySynthesisOutcome?.updatedSummaryPagePaths).toHaveLength(
      6
    );
    expect(runnerTurnEvent.engineRequestSummary?.policyContextIncluded).toBe(
      true
    );
    expect(
      runnerTurnEvent.engineRequestSummary?.actionContractContextIncluded
    ).toBe(true);
    expect(runnerTurnEvent.engineRequestSummary?.memoryRefCount).toBe(6);
    expect(runnerTurnEvent.memoryRepositorySyncOutcome?.status).toBe("committed");
    expect(runnerTurnEvent.sourceChangeSummary?.fileCount).toBe(1);
    expect(runnerTurnEvent.sourceChangeCandidateIds).toEqual([
      "source-change-turn-alpha"
    ]);
    expect(sourceHistoryEvent.type).toBe("source_history.updated");
    expect(sourceHistoryEvent.mode).toBe("already_in_workspace");
    expect(sourceHistoryPublishedEvent.type).toBe("source_history.published");
    expect(sourceHistoryEvent.approvalId).toBe("approval-source-apply-alpha");
    expect(sourceHistoryPublishedEvent.publicationState).toBe("published");
    expect(sourceHistoryPublishedEvent.approvalId).toBe(
      "approval-source-publish-alpha"
    );
    expect(sourceHistoryPublishedEvent.targetRepositoryName).toBe("graph-alpha");
    expect(sourceHistoryReplayedEvent.type).toBe("source_history.replayed");
    expect(sourceHistoryReplayedEvent.replayStatus).toBe("replayed");
    expect(wikiRepositoryPublishedEvent.type).toBe(
      "wiki_repository.published"
    );
    expect(wikiRepositoryPublishedEvent.publicationState).toBe("published");
    expect(wikiRepositoryPublishedEvent.targetRepositoryName).toBe("graph-alpha");
  });

  it("rejects engine outcomes that claim failure without stopReason error", () => {
    const result = engineTurnOutcomeSchema.safeParse({
      failure: {
        classification: "auth_error",
        message: "Authentication failed."
      },
      stopReason: "completed",
      toolExecutions: []
    });

    expect(result.success).toBe(false);
  });

  it("accepts generic engine session identifiers, versions, and permission observations on engine outcomes", () => {
    const result = engineTurnOutcomeSchema.parse({
      engineSessionId: "engine-session-alpha",
      engineVersion: "0.10.0",
      permissionObservations: [
        {
          decision: "rejected",
          operation: "command_execution",
          patterns: ["git push origin main"],
          permission: "bash",
          reason: "OpenCode one-shot CLI auto-rejected the permission request."
        }
      ],
      providerStopReason: "opencode_process_exit_0",
      stopReason: "completed",
      toolExecutions: [
        {
          durationMs: 650,
          inputSummary: '{"command":"pnpm test"}',
          outcome: "success",
          outputSummary: "Tests passed.",
          sequence: 1,
          title: "Run tests",
          toolCallId: "tool-call-alpha",
          toolId: "bash"
        }
      ]
    });

    expect(result.engineSessionId).toBe("engine-session-alpha");
    expect(result.engineVersion).toBe("0.10.0");
    expect(result.toolExecutions[0]?.title).toBe("Run tests");
    expect(result.permissionObservations[0]?.operation).toBe(
      "command_execution"
    );
  });

  it("accepts typed conversation, approval, and artifact trace events", () => {
    const conversationEvent = hostEventRecordSchema.parse({
      artifactIds: ["report-turn-001"],
      category: "session",
      conversationId: "conv-alpha",
      eventId: "conversation-worker-it-001",
      followupCount: 1,
      graphId: "graph-alpha",
      initiator: "peer",
      lastMessageType: "task.request",
      message: "Conversation 'conv-alpha' on node 'worker-it' is now 'working'.",
      nodeId: "worker-it",
      peerNodeId: "supervisor-it",
      schemaVersion: "1",
      sessionId: "session-alpha",
      status: "working",
      timestamp: "2026-04-24T00:00:02.000Z",
      type: "conversation.trace.event",
      updatedAt: "2026-04-24T00:00:02.000Z"
    });
    const approvalEvent = hostEventRecordSchema.parse({
      approvalId: "approval-alpha",
      approverNodeIds: ["supervisor-it"],
      category: "session",
      conversationId: "conv-alpha",
      eventId: "approval-worker-it-001",
      graphId: "graph-alpha",
      message: "Approval 'approval-alpha' on node 'worker-it' is now 'pending'.",
      nodeId: "worker-it",
      operation: "source_publication",
      requestedAt: "2026-04-24T00:00:03.000Z",
      requestedByNodeId: "worker-it",
      resource: {
        id: "source-history-alpha|gitea|team-alpha|team-alpha",
        kind: "source_history_publication",
        label: "source-history-alpha -> gitea/team-alpha/team-alpha"
      },
      schemaVersion: "1",
      sessionId: "session-alpha",
      status: "pending",
      timestamp: "2026-04-24T00:00:03.000Z",
      type: "approval.trace.event",
      updatedAt: "2026-04-24T00:00:03.000Z"
    });
    const artifactEvent = hostEventRecordSchema.parse({
      artifactId: "report-turn-001",
      artifactKind: "report_file",
      backend: "git",
      category: "session",
      conversationId: "conv-alpha",
      eventId: "artifact-worker-it-001",
      graphId: "graph-alpha",
      lifecycleState: "published",
      message:
        "Artifact 'report-turn-001' on node 'worker-it' changed trace state.",
      nodeId: "worker-it",
      publicationState: "published",
      schemaVersion: "1",
      sessionId: "session-alpha",
      timestamp: "2026-04-24T00:00:04.000Z",
      turnId: "turn-alpha",
      type: "artifact.trace.event",
      updatedAt: "2026-04-24T00:00:04.000Z"
    });

    expect(conversationEvent.type).toBe("conversation.trace.event");
    expect(approvalEvent.type).toBe("approval.trace.event");
    const parsedApprovalEvent = approvalTraceEventSchema.parse(approvalEvent);
    expect(parsedApprovalEvent.operation).toBe("source_publication");
    expect(parsedApprovalEvent.resource?.kind).toBe("source_history_publication");
    expect(
      approvalTraceEventSchema.parse({
        ...approvalEvent,
        eventId: "approval-worker-it-wiki",
        operation: "wiki_update",
        resource: {
          id: "worker-it|gitea|team-alpha|wiki-public",
          kind: "wiki_repository_publication",
          label: "worker-it wiki -> gitea/team-alpha/wiki-public"
        }
      }).resource?.kind
    ).toBe("wiki_repository_publication");
    expect(artifactEvent.type).toBe("artifact.trace.event");
  });

  it("accepts a typed node-binding mutation event", () => {
    const result = hostEventRecordSchema.parse({
      activeRevisionId: "graph-alpha-20260423-000001",
      category: "control_plane",
      eventId: "evt-node-binding-001",
      graphId: "graph-alpha",
      message: "Created managed node 'reviewer-it' in graph 'graph-alpha'.",
      mutationKind: "created",
      nodeId: "reviewer-it",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "node.binding.updated"
    });

    expect(result.type).toBe("node.binding.updated");
    expect(result.mutationKind).toBe("created");
  });

  it("accepts a typed edge mutation event", () => {
    const result = hostEventRecordSchema.parse({
      activeRevisionId: "graph-alpha-20260423-000001",
      category: "control_plane",
      edgeId: "user-to-reviewer",
      eventId: "evt-edge-001",
      graphId: "graph-alpha",
      message: "Created edge 'user-to-reviewer' in graph 'graph-alpha'.",
      mutationKind: "created",
      schemaVersion: "1",
      timestamp: "2026-04-23T00:00:00.000Z",
      type: "edge.updated"
    });

    expect(result.type).toBe("edge.updated");
    expect(result.mutationKind).toBe("created");
  });
});

describe("runtime recovery contracts", () => {
  it("accepts a runtime recovery inspection response", () => {
    const result = runtimeRecoveryInspectionResponseSchema.parse({
      controller: {
        activeFailureFingerprint: "fp-worker-it",
        attemptsUsed: 1,
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000001",
        lastAttemptedAt: "2026-04-24T10:06:00.000Z",
        lastFailureAt: "2026-04-24T10:06:00.000Z",
        nodeId: "worker-it",
        schemaVersion: "1",
        state: "cooldown",
        updatedAt: "2026-04-24T10:06:00.000Z"
      },
      currentRuntime: {
        backendKind: "docker",
        contextAvailable: true,
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260424-000001",
        nodeId: "worker-it",
        observedState: "running",
        restartGeneration: 0
      },
      entries: [
        {
          recordedAt: "2026-04-24T10:05:00.000Z",
          recoveryId: "worker-it-20260424t100500-running",
          runtime: {
            backendKind: "docker",
            contextAvailable: true,
            desiredState: "running",
            graphId: "team-alpha",
            graphRevisionId: "team-alpha-20260424-000001",
            nodeId: "worker-it",
            observedState: "running",
            restartGeneration: 0
          }
        }
      ],
      nodeId: "worker-it",
      policy: {
        nodeId: "worker-it",
        policy: {
          cooldownSeconds: 30,
          maxAttempts: 3,
          mode: "restart_on_failure"
        },
        schemaVersion: "1",
        updatedAt: "2026-04-24T10:05:30.000Z"
      }
    });

    expect(result.nodeId).toBe("worker-it");
    expect(result.entries).toHaveLength(1);
    expect(result.controller.state).toBe("cooldown");
    expect(result.policy.policy.mode).toBe("restart_on_failure");
  });
});

describe("reconciliation contracts", () => {
  it("classifies missing context as a degraded reconciliation finding", () => {
    expect(
      classifyRuntimeReconciliation({
        contextAvailable: false,
        desiredState: "running",
        observedState: "stopped"
      })
    ).toEqual({
      findingCodes: ["context_unavailable", "runtime_stopped"],
      state: "degraded"
    });
  });

  it("accepts legacy reconciliation snapshots and derives richer counts", () => {
    const result = reconciliationSnapshotSchema.parse({
      backendKind: "memory",
      failedRuntimeCount: 0,
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-rev-001",
      lastReconciledAt: "2026-04-24T00:00:00.000Z",
      managedRuntimeCount: 1,
      nodes: [
        {
          desiredState: "running",
          nodeId: "worker-it",
          observedState: "missing",
          statusMessage: "Runtime is missing."
        }
      ],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 1
    });

    expect(result.degradedRuntimeCount).toBe(1);
    expect(result.blockedRuntimeCount).toBe(0);
    expect(result.issueCount).toBe(1);
    expect(result.transitioningRuntimeCount).toBe(0);
    expect(result.findingCodes).toEqual(["runtime_missing"]);
    expect(result.nodes[0]?.reconciliation).toEqual({
      findingCodes: ["runtime_missing"],
      state: "degraded"
    });
  });

  it("accepts host status summaries with richer reconciliation counts", () => {
    const result = hostStatusResponseSchema.parse({
      artifactBackendCache: {
        available: true,
        repositoryCount: 1,
        totalSizeBytes: 1024,
        updatedAt: "2026-04-24T00:00:00.000Z"
      },
      graphRevisionId: "graph-alpha-rev-001",
      reconciliation: {
        backendKind: "docker",
        blockedRuntimeCount: 1,
        degradedRuntimeCount: 1,
        failedRuntimeCount: 0,
        findingCodes: ["context_unavailable"],
        issueCount: 1,
        lastReconciledAt: "2026-04-24T00:00:00.000Z",
        managedRuntimeCount: 2,
        runningRuntimeCount: 1,
        stoppedRuntimeCount: 1,
        transitioningRuntimeCount: 0
      },
      runtimeCounts: {
        desired: 2,
        observed: 1,
        running: 1
      },
      security: {
        operatorAuthMode: "bootstrap_operator_token",
        operatorId: "ops-lead",
        operatorRole: "admin"
      },
      service: "entangle-host",
      stateLayout: {
        checkedAt: "2026-04-24T00:00:00.000Z",
        currentLayoutVersion: 1,
        minimumSupportedLayoutVersion: 1,
        recordedAt: "2026-04-24T00:00:00.000Z",
        recordedLayoutVersion: 1,
        status: "current"
      },
      status: "degraded",
      timestamp: "2026-04-24T00:00:00.000Z",
      transport: {
        controlObserve: {
          configuredRelayCount: 1,
          lastFailureAt: "2026-04-24T00:00:00.000Z",
          lastFailureMessage: "relay refused subscription",
          relayUrls: ["ws://relay.entangle.test"],
          relays: [
            {
              lastFailureAt: "2026-04-24T00:00:00.000Z",
              lastFailureMessage: "relay refused subscription",
              relayUrl: "ws://relay.entangle.test",
              status: "degraded",
              updatedAt: "2026-04-24T00:00:00.000Z"
            }
          ],
          status: "degraded",
          updatedAt: "2026-04-24T00:00:00.000Z"
        }
      }
    });

    expect(result.reconciliation.blockedRuntimeCount).toBe(1);
    expect(result.reconciliation.findingCodes).toEqual(["context_unavailable"]);
    expect(result.artifactBackendCache?.repositoryCount).toBe(1);
    expect(result.security).toEqual({
      operatorAuthMode: "bootstrap_operator_token",
      operatorId: "ops-lead",
      operatorRole: "admin"
    });
    expect(result.stateLayout.status).toBe("current");
    expect(result.transport.controlObserve.status).toBe("degraded");
  });

  it("accepts multi-operator bootstrap host auth status", () => {
    const result = hostStatusResponseSchema.parse({
      reconciliation: {
        backendKind: "memory",
        blockedRuntimeCount: 0,
        degradedRuntimeCount: 0,
        failedRuntimeCount: 0,
        findingCodes: [],
        issueCount: 0,
        managedRuntimeCount: 0,
        runningRuntimeCount: 0,
        stoppedRuntimeCount: 0,
        transitioningRuntimeCount: 0
      },
      runtimeCounts: {
        desired: 0,
        observed: 0,
        running: 0
      },
      security: {
        operatorAuthMode: "bootstrap_operator_tokens",
        operatorCount: 2,
        operators: [
          {
            operatorId: "ops-admin",
            operatorRole: "admin"
          },
          {
            operatorId: "audit-viewer",
            operatorRole: "viewer"
          }
        ]
      },
      service: "entangle-host",
      stateLayout: {
        checkedAt: "2026-04-29T00:00:00.000Z",
        currentLayoutVersion: 1,
        minimumSupportedLayoutVersion: 1,
        recordedAt: "2026-04-29T00:00:00.000Z",
        recordedLayoutVersion: 1,
        status: "current"
      },
      status: "healthy",
      timestamp: "2026-04-29T00:00:00.000Z",
      transport: {
        controlObserve: {
          configuredRelayCount: 0,
          relayUrls: [],
          status: "disabled",
          updatedAt: "2026-04-29T00:00:00.000Z"
        }
      }
    });

    expect(result.security).toEqual({
      operatorAuthMode: "bootstrap_operator_tokens",
      operatorCount: 2,
      operators: [
        {
          operatorId: "ops-admin",
          operatorRole: "admin"
        },
        {
          operatorId: "audit-viewer",
          operatorRole: "viewer"
        }
      ]
    });
  });

  it("accepts scoped bootstrap host auth status", () => {
    const result = hostStatusResponseSchema.parse({
      reconciliation: {
        backendKind: "memory",
        blockedRuntimeCount: 0,
        degradedRuntimeCount: 0,
        failedRuntimeCount: 0,
        findingCodes: [],
        issueCount: 0,
        managedRuntimeCount: 0,
        runningRuntimeCount: 0,
        stoppedRuntimeCount: 0,
        transitioningRuntimeCount: 0
      },
      runtimeCounts: {
        desired: 0,
        observed: 0,
        running: 0
      },
      security: {
        operatorAuthMode: "bootstrap_operator_token",
        operatorId: "assignment-ops",
        operatorPermissions: ["host.assignments.write", "host.read"],
        operatorRole: "operator"
      },
      service: "entangle-host",
      stateLayout: {
        checkedAt: "2026-04-29T00:00:00.000Z",
        currentLayoutVersion: 1,
        minimumSupportedLayoutVersion: 1,
        recordedAt: "2026-04-29T00:00:00.000Z",
        recordedLayoutVersion: 1,
        status: "current"
      },
      status: "healthy",
      timestamp: "2026-04-29T00:00:00.000Z",
      transport: {
        controlObserve: {
          configuredRelayCount: 0,
          relayUrls: [],
          status: "disabled",
          updatedAt: "2026-04-29T00:00:00.000Z"
        }
      }
    });

    expect(result.security).toEqual({
      operatorAuthMode: "bootstrap_operator_token",
      operatorId: "assignment-ops",
      operatorPermissions: ["host.assignments.write", "host.read"],
      operatorRole: "operator"
    });
  });

  it("accepts artifact backend cache clear responses", () => {
    const result = hostArtifactBackendCacheClearResponseSchema.parse({
      completedAt: "2026-04-24T00:00:01.000Z",
      dryRun: true,
      gitServiceRef: "gitea",
      matchedRepositoryCount: 2,
      maxSizeBytes: 8192,
      namespace: "team-alpha",
      olderThanSeconds: 3600,
      repositoryCount: 2,
      repositoryName: "graph-alpha",
      retainedRepositoryCount: 1,
      retainedSizeBytes: 4096,
      status: "dry_run",
      totalSizeBytes: 4096
    });

    expect(result.gitServiceRef).toBe("gitea");
    expect(result.matchedRepositoryCount).toBe(2);
    expect(result.maxSizeBytes).toBe(8192);
    expect(result.namespace).toBe("team-alpha");
    expect(result.olderThanSeconds).toBe(3600);
    expect(result.repositoryCount).toBe(2);
    expect(result.repositoryName).toBe("graph-alpha");
    expect(result.retainedRepositoryCount).toBe(1);
    expect(result.retainedSizeBytes).toBe(4096);
    expect(result.status).toBe("dry_run");
  });

  it("accepts only the current Entangle state layout product marker", () => {
    const baseRecord = {
      createdAt: observedAt,
      layoutVersion: 1,
      schemaVersion: "1",
      updatedAt: observedAt
    };

    expect(
      stateLayoutRecordSchema.parse({
        ...baseRecord,
        product: "entangle"
      }).product
    ).toBe("entangle");
    expect(() =>
      stateLayoutRecordSchema.parse({
        ...baseRecord,
        product: "other-product"
      })
    ).toThrow();
  });
});

describe("graph revision contracts", () => {
  it("accepts edge create requests with canonical defaults", () => {
    const result = edgeCreateRequestSchema.parse({
      edgeId: "user-to-worker",
      fromNodeId: "user-main",
      toNodeId: "worker-it",
      relation: "delegates_to"
    });

    expect(result.enabled).toBe(true);
    expect(result.transportPolicy.channel).toBe("default");
  });

  it("accepts graph revision inspection responses", () => {
    const result = graphRevisionInspectionResponseSchema.parse({
      graph: {
        graphId: "team-alpha",
        name: "Team Alpha",
        schemaVersion: "1",
        nodes: [
          {
            bindings: {},
            displayName: "User",
            nodeId: "user-main",
            nodeKind: "user",
            runtime: {
              enabled: false
            }
          }
        ],
        edges: []
      },
      revision: {
        appliedAt: "2026-04-23T00:00:00.000Z",
        graphId: "team-alpha",
        isActive: true,
        revisionId: "team-alpha-20260423-000000"
      }
    });

    expect(result.revision.isActive).toBe(true);
    expect(result.graph.graphId).toBe("team-alpha");
  });
});

describe("node inspection contracts", () => {
  it("rejects user nodes from managed-node create requests", () => {
    expect(() =>
      nodeCreateRequestSchema.parse({
        displayName: "User",
        nodeId: "user-main",
        nodeKind: "user"
      })
    ).toThrow();
  });

  it("accepts a typed node inspection response", () => {
    const result = nodeInspectionResponseSchema.parse({
      binding: {
        bindingId: "team-alpha-worker-it",
        externalPrincipals: [],
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        node: {
          autonomy: {
            canInitiateSessions: true,
            canMutateGraph: false
          },
          displayName: "Worker IT",
          nodeId: "worker-it",
          nodeKind: "worker",
          packageSourceRef: "worker-it-source",
          resourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: ["gitea"],
            modelEndpointProfileRef: "shared-anthropic",
            primaryGitServiceRef: "gitea",
            primaryRelayProfileRef: "preview-relay",
            relayProfileRefs: ["preview-relay"]
          }
        },
        packageSource: {
          absolutePath: "/tmp/packages/worker-it",
          admittedAt: "2026-04-23T00:00:00.000Z",
          manifestPath: "/tmp/packages/worker-it/manifest.json",
          materialization: {
            contentDigest:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            materializationKind: "immutable_store",
            packageRoot: "/tmp/store/worker-it/package",
            synchronizedAt: "2026-04-23T00:00:00.000Z"
          },
          packageSourceId: "worker-it-source",
          packageStoreKey: "sha256-abc123",
          sourceKind: "local_path"
        },
        resolvedResourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: ["gitea"],
          modelEndpointProfileRef: "shared-anthropic",
          primaryGitServiceRef: "gitea",
          primaryRelayProfileRef: "preview-relay",
          relayProfileRefs: ["preview-relay"]
        },
        runtimeProfile: "federated",
        schemaVersion: "1"
      },
      runtime: {
        backendKind: "docker",
        contextAvailable: true,
        desiredState: "running",
        graphId: "team-alpha",
        graphRevisionId: "team-alpha-20260423-000000",
        nodeId: "worker-it",
        observedState: "running",
        packageSourceId: "worker-it-source",
        reason: "running",
        restartGeneration: 0,
        runtimeHandle: "container://worker-it",
        statusMessage: "Runtime is healthy."
      }
    });

    expect(result.binding.node.nodeId).toBe("worker-it");
    expect(result.runtime.nodeId).toBe("worker-it");
  });
});

describe("git service contracts", () => {
  it("accepts an SSH git service with an explicit remote base", () => {
    const result = gitServiceProfileSchema.parse({
      id: "gitea",
      displayName: "Gitea",
      baseUrl: "http://gitea:3000",
      remoteBase: "ssh://git@gitea:22",
      transportKind: "ssh",
      authMode: "ssh_key",
      defaultNamespace: "team-alpha",
      provisioning: {
        mode: "preexisting"
      }
    });

    expect(result.remoteBase).toBe("ssh://git@gitea:22");
    expect(result.provisioning.mode).toBe("preexisting");
  });

  it("rejects git services whose remote base does not match the transport kind", () => {
    expect(
      gitServiceProfileSchema.safeParse({
        id: "gitea",
        displayName: "Gitea",
        baseUrl: "http://gitea:3000",
        remoteBase: "http://gitea:3000",
        transportKind: "ssh",
        authMode: "ssh_key"
      }).success
    ).toBe(false);
  });

  it("derives a primary git repository target deterministically", () => {
    const target = resolvePrimaryGitRepositoryTarget({
      defaultNamespace: "team-alpha",
      gitServices: [
        gitServiceProfileSchema.parse({
          id: "gitea",
          displayName: "Gitea",
          baseUrl: "http://gitea:3000",
          remoteBase: "ssh://git@gitea:22",
          transportKind: "ssh",
          authMode: "ssh_key",
          defaultNamespace: "team-alpha",
          provisioning: {
            mode: "preexisting"
          }
        })
      ],
      graphId: "graph-alpha",
      primaryGitServiceRef: "gitea"
    });

    expect(target).toEqual({
      gitServiceRef: "gitea",
      namespace: "team-alpha",
      provisioningMode: "preexisting",
      remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
      repositoryName: "graph-alpha",
      transportKind: "ssh"
    });
  });

  it("resolves sibling repository targets from a primary-target remote override", () => {
    const target = resolveGitRepositoryTargetForArtifactLocator({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [],
        gitServices: [
          gitServiceProfileSchema.parse({
            id: "gitea",
            displayName: "Gitea",
            baseUrl: "http://gitea:3000",
            remoteBase: "ssh://git@gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "team-alpha",
            provisioning: {
              mode: "preexisting"
            }
          })
        ],
        primaryGitRepositoryTarget: {
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          provisioningMode: "preexisting",
          remoteUrl: "/tmp/entangle-remotes/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        },
        primaryGitServiceRef: "gitea"
      },
      locator: {
        branch: "worker-it/session-alpha/review",
        commit: "abc123",
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        repositoryName: "review-artifacts",
        path: "reports/session-alpha/turn-001.md"
      }
    });

    expect(target).toEqual({
      gitServiceRef: "gitea",
      namespace: "team-alpha",
      provisioningMode: "preexisting",
      remoteUrl: "/tmp/entangle-remotes/review-artifacts.git",
      repositoryName: "review-artifacts",
      transportKind: "ssh"
    });
  });

  it("resolves locator-specific repository targets from bound non-primary services", () => {
    const target = resolveGitRepositoryTargetForArtifactLocator({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [],
        gitServices: [
          gitServiceProfileSchema.parse({
            id: "gitea",
            displayName: "Gitea",
            baseUrl: "http://gitea:3000",
            remoteBase: "ssh://git@gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "team-alpha",
            provisioning: {
              mode: "preexisting"
            }
          }),
          gitServiceProfileSchema.parse({
            id: "backup-gitea",
            displayName: "Backup Gitea",
            baseUrl: "http://backup-gitea:3000",
            remoteBase: "ssh://git@backup-gitea:22",
            transportKind: "ssh",
            authMode: "ssh_key",
            defaultNamespace: "backup-team",
            provisioning: {
              mode: "preexisting"
            }
          })
        ],
        primaryGitRepositoryTarget: {
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          provisioningMode: "preexisting",
          remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        },
        primaryGitServiceRef: "gitea"
      },
      locator: {
        branch: "worker-it/session-alpha/review",
        commit: "abc123",
        gitServiceRef: "backup-gitea",
        namespace: "backup-team",
        repositoryName: "review-artifacts",
        path: "reports/session-alpha/turn-001.md"
      }
    });

    expect(target?.remoteUrl).toBe(
      "ssh://git@backup-gitea:22/backup-team/review-artifacts.git"
    );
  });
});

describe("git repository provisioning contracts", () => {
  it("accepts a ready provisioning record", () => {
    const result = gitRepositoryProvisioningRecordSchema.parse({
      checkedAt: "2026-04-23T00:00:00.000Z",
      created: true,
      schemaVersion: "1",
      state: "ready",
      target: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        provisioningMode: "gitea_api",
        remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
        repositoryName: "graph-alpha",
        transportKind: "ssh"
      }
    });

    expect(result.state).toBe("ready");
    expect(result.created).toBe(true);
  });

  it("rejects failed provisioning records without an error", () => {
    expect(
      gitRepositoryProvisioningRecordSchema.safeParse({
        checkedAt: "2026-04-23T00:00:00.000Z",
        schemaVersion: "1",
        state: "failed",
        target: {
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          provisioningMode: "gitea_api",
          remoteUrl: "ssh://git@gitea:22/team-alpha/graph-alpha.git",
          repositoryName: "graph-alpha",
          transportKind: "ssh"
        }
      }).success
    ).toBe(false);
  });
});

describe("runtime git resolution helpers", () => {
  it("prefers the primary principal binding when it matches the requested service", () => {
    const resolution = resolveGitPrincipalBindingForService({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-main",
              displayName: "Worker IT Git Main",
              systemKind: "git",
              gitServiceRef: "gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/main"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/main",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-main"
              }
            })
          },
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-backup",
              displayName: "Worker IT Git Backup",
              systemKind: "git",
              gitServiceRef: "gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/backup"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/backup",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-backup"
              }
            })
          }
        ],
        gitServices: [],
        primaryGitPrincipalRef: "worker-it-git-backup",
        primaryGitServiceRef: "gitea"
      },
      gitServiceRef: "gitea"
    });

    expect(resolution.status).toBe("resolved");
    if (resolution.status === "resolved") {
      expect(resolution.binding.principal.principalId).toBe(
        "worker-it-git-backup"
      );
    }
  });

  it("reports ambiguity when multiple service principals exist without a deterministic selection", () => {
    const resolution = resolveGitPrincipalBindingForService({
      artifactContext: {
        backends: ["git"],
        defaultNamespace: "team-alpha",
        gitPrincipalBindings: [
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-main",
              displayName: "Worker IT Git Main",
              systemKind: "git",
              gitServiceRef: "gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/main"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/main",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-main"
              }
            })
          },
          {
            principal: externalPrincipalRecordSchema.parse({
              principalId: "worker-it-git-backup",
              displayName: "Worker IT Git Backup",
              systemKind: "git",
              gitServiceRef: "gitea",
              subject: "worker-it",
              transportAuthMode: "ssh_key",
              secretRef: "secret://git/worker-it/backup"
            }),
            transport: resolvedSecretBindingSchema.parse({
              secretRef: "secret://git/worker-it/backup",
              status: "available",
              delivery: {
                mode: "mounted_file",
                filePath: "/tmp/git-backup"
              }
            })
          }
        ],
        gitServices: [],
        primaryGitServiceRef: "backup-gitea"
      },
      gitServiceRef: "gitea"
    });

    expect(resolution.status).toBe("ambiguous");
  });
});

describe("secret reference contracts", () => {
  it("accepts secret:// references with safe path segments", () => {
    expect(secretRefSchema.parse("secret://git/worker-it/ssh")).toBe(
      "secret://git/worker-it/ssh"
    );
  });

  it("rejects unsafe or malformed secret references", () => {
    expect(secretRefSchema.safeParse("https://example.com/secret").success).toBe(
      false
    );
    expect(secretRefSchema.safeParse("secret://git/../ssh").success).toBe(false);
    expect(secretRefSchema.safeParse("secret://git/worker it/ssh").success).toBe(
      false
    );
  });
});

describe("resolved secret bindings", () => {
  it("accepts an available mounted secret binding", () => {
    const result = resolvedSecretBindingSchema.parse({
      secretRef: "secret://git/worker-it/ssh",
      status: "available",
      delivery: {
        mode: "mounted_file",
        filePath: "/entangle-secrets/refs/git/worker-it/ssh"
      }
    });

    expect(result.status).toBe("available");
  });

  it("rejects inconsistent delivery/status combinations", () => {
    expect(
      resolvedSecretBindingSchema.safeParse({
        secretRef: "secret://git/worker-it/ssh",
        status: "missing",
        delivery: {
          mode: "mounted_file",
          filePath: "/entangle-secrets/refs/git/worker-it/ssh"
        }
      }).success
    ).toBe(false);
  });
});

describe("model runtime context contracts", () => {
  it("requires explicit authMode on model endpoint profiles", () => {
    expect(
      modelEndpointProfileSchema.safeParse({
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus-4-7"
      }).success
    ).toBe(false);
  });

  it("accepts a model profile paired with the matching resolved auth binding", () => {
    const result = modelRuntimeContextSchema.parse({
      modelEndpointProfile: {
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        authMode: "header_secret",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus-4-7"
      },
      auth: {
        secretRef: "secret://shared-model",
        status: "available",
        delivery: {
          mode: "mounted_file",
          filePath: "/entangle-secrets/refs/shared-model"
        }
      }
    });

    expect(result.auth?.status).toBe("available");
  });

  it("rejects mismatched model profile and auth binding secret refs", () => {
    expect(
      modelRuntimeContextSchema.safeParse({
        modelEndpointProfile: {
          id: "shared-model",
          displayName: "Shared Model",
          adapterKind: "anthropic",
          baseUrl: "https://api.anthropic.com",
          authMode: "header_secret",
          secretRef: "secret://shared-model",
          defaultModel: "claude-opus-4-7"
        },
        auth: {
          secretRef: "secret://different-model",
          status: "available",
          delivery: {
            mode: "mounted_file",
            filePath: "/entangle-secrets/refs/different-model"
          }
        }
      }).success
    ).toBe(false);
  });
});

describe("agent runtime contracts", () => {
  it("accepts OpenCode as a process-backed agent engine profile", () => {
    const result = agentEngineProfileSchema.parse({
      id: "opencode-default",
      displayName: "OpenCode",
      kind: "opencode_server",
      executable: "opencode",
      defaultAgent: "build"
    });

    expect(result).toMatchObject({
      id: "opencode-default",
      kind: "opencode_server",
      stateScope: "node"
    });
    expect(result.permissionMode).toBeUndefined();
  });

  it("accepts explicit OpenCode permission mode on agent engine profiles", () => {
    const result = agentEngineProfileSchema.parse({
      id: "opencode-default",
      displayName: "OpenCode",
      kind: "opencode_server",
      executable: "opencode",
      permissionMode: "entangle_approval"
    });

    expect(result.permissionMode).toBe("entangle_approval");
  });

  it("accepts atomic agent engine profile upsert requests", () => {
    const result = agentEngineProfileUpsertRequestSchema.parse({
      baseUrl: "http://127.0.0.1:18081",
      displayName: "Attached OpenCode",
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      setDefault: true,
      stateScope: "shared"
    });

    expect(result).toMatchObject({
      baseUrl: "http://127.0.0.1:18081",
      clearBaseUrl: false,
      displayName: "Attached OpenCode",
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      setDefault: true,
      stateScope: "shared"
    });
  });

  it("rejects conflicting agent engine profile upsert fields", () => {
    expect(
      agentEngineProfileUpsertRequestSchema.safeParse({
        baseUrl: "http://127.0.0.1:18081",
        clearBaseUrl: true
      }).success
    ).toBe(false);
  });

  it("rejects process-backed agent engine profiles without an endpoint", () => {
    expect(
      agentEngineProfileSchema.safeParse({
        id: "opencode-default",
        displayName: "OpenCode",
        kind: "opencode_server"
      }).success
    ).toBe(false);
  });

  it("resolves node agent runtime from graph and catalog defaults", () => {
    const catalog = deploymentResourceCatalogSchema.parse({
      schemaVersion: "1",
      catalogId: "default-catalog",
      agentEngineProfiles: [
        {
          id: "opencode-default",
          displayName: "OpenCode",
          kind: "opencode_server",
          executable: "opencode",
          defaultAgent: "build"
        }
      ],
      defaults: {
        relayProfileRefs: [],
        agentEngineProfileRef: "opencode-default"
      }
    });
    const graph = graphSpecSchema.parse({
      schemaVersion: "1",
      graphId: "agentic-team",
      name: "Agentic Team",
      nodes: [
        {
          nodeId: "builder",
          displayName: "Builder",
          nodeKind: "worker"
        }
      ],
      defaults: {
        resourceBindings: {
          externalPrincipalRefs: [],
          gitServiceRefs: [],
          relayProfileRefs: []
        },
        runtimeProfile: "federated",
        agentRuntime: {
          mode: "coding_agent"
        }
      }
    });

    expect(resolveEffectiveAgentRuntime(graph.nodes[0]!, graph, catalog)).toEqual({
      mode: "coding_agent",
      engineProfileRef: "opencode-default",
      defaultAgent: "build"
    });
  });
});

describe("distributed proof profile contracts", () => {
  it("accepts a generated three-runner distributed proof profile", () => {
    const result = distributedProofProfileSchema.parse({
      agentEngineKind: "opencode_server",
      agentEngineKinds: ["opencode_server"],
      agentNodeId: "builder",
      agentRunnerId: "distributed-agent-runner",
      assignments: [
        {
          assignmentId: "assignment-distributed-agent-runner",
          nodeId: "builder",
          runnerId: "distributed-agent-runner",
          runtimeKinds: ["agent_runner"]
        },
        {
          assignmentId: "assignment-distributed-user-runner",
          nodeId: "user",
          runnerId: "distributed-user-runner",
          runtimeKinds: ["human_interface"]
        },
        {
          assignmentId: "assignment-distributed-reviewer-user-runner",
          nodeId: "reviewer",
          runnerId: "distributed-reviewer-user-runner",
          runtimeKinds: ["human_interface"]
        }
      ],
      checkGitBackendHealth: true,
      checkPublishedGitRef: true,
      checkUserClientHealth: true,
      gitServiceRefs: ["gitea"],
      hostUrl: "http://host.example:7071",
      relayUrls: ["ws://relay.example:7777"],
      requireConversation: true,
      requireArtifactEvidence: true,
      requirePublishedGitArtifact: true,
      schemaVersion: 1,
      userNodeId: "user",
      userRunnerId: "distributed-user-runner"
    });

    expect(result.agentEngineKind).toBe("opencode_server");
    expect(result.assignments).toHaveLength(3);
    expect(result.checkPublishedGitRef).toBe(true);
    expect(result.checkUserClientHealth).toBe(true);
    expect(result.requireConversation).toBe(true);
    expect(result.requireArtifactEvidence).toBe(true);
    expect(result.requirePublishedGitArtifact).toBe(true);
  });

  it("rejects profiles whose primary engine is not advertised", () => {
    expect(
      distributedProofProfileSchema.safeParse({
        agentEngineKind: "opencode_server",
        agentEngineKinds: ["external_process"],
        schemaVersion: 1
      }).success
    ).toBe(false);
  });

  it("accepts a primary engine override without an engine-kind list", () => {
    const result = distributedProofProfileSchema.parse({
      agentEngineKind: "external_process",
      schemaVersion: 1
    });

    expect(result.agentEngineKind).toBe("external_process");
    expect(result.agentEngineKinds).toEqual([]);
  });

  it("rejects inconsistent assignment runtime kinds", () => {
    expect(
      distributedProofProfileSchema.safeParse({
        agentNodeId: "builder",
        agentRunnerId: "distributed-agent-runner",
        assignments: [
          {
            assignmentId: "assignment-distributed-agent-runner",
            nodeId: "builder",
            runnerId: "distributed-agent-runner",
            runtimeKinds: ["human_interface"]
          }
        ],
        schemaVersion: 1
      }).success
    ).toBe(false);
  });
});

describe("package tool catalog contracts", () => {
  it("accepts an explicit builtin tool catalog", () => {
    const result = packageToolCatalogSchema.parse({
      schemaVersion: "1",
      tools: [
        {
          id: "inspect_artifact_input",
          description: "Inspect a retrieved inbound artifact by artifact id.",
          inputSchema: {
            type: "object",
            properties: {
              artifactId: {
                type: "string"
              }
            },
            required: ["artifactId"]
          },
          execution: {
            kind: "builtin",
            builtinToolId: "inspect_artifact_input"
          }
        }
      ]
    });

    expect(result.tools).toHaveLength(1);
  });

  it("rejects builtin tool ids outside the canonical Entangle surface", () => {
    expect(
      packageToolCatalogSchema.safeParse({
        schemaVersion: "1",
        tools: [
          {
            id: "write_report_file",
            description: "Unsupported custom tool id.",
            inputSchema: {},
            execution: {
              kind: "builtin",
              builtinToolId: "write_report_file"
            }
          }
        ]
      }).success
    ).toBe(false);
  });

  it("rejects duplicate tool ids in the catalog", () => {
    expect(
      packageToolCatalogSchema.safeParse({
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "first",
            inputSchema: {},
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          },
          {
            id: "inspect_artifact_input",
            description: "second",
            inputSchema: {},
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }).success
    ).toBe(false);
  });
});

describe("engine tool execution contracts", () => {
  it("accepts structured tool execution requests and results", () => {
    const observation = engineToolExecutionObservationSchema.parse({
      errorCode: "tool_result_error",
      message: "Tool returned an explicit bounded error result.",
      outcome: "error",
      sequence: 1,
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
      toolId: "inspect_artifact_input"
    });
    const request = engineToolExecutionRequestSchema.parse({
      artifactInputs: [
        {
          artifactId: "input-report",
          backend: "git",
          localPath: "/tmp/entangle/retrieval/input.md",
          repoPath: "/tmp/entangle/retrieval/repo",
          sourceRef: {
            artifactId: "input-report",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/review-patch",
              commit: "abc123",
              gitServiceRef: "gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      input: {
        artifactId: "input-report"
      },
      memoryRefs: ["/tmp/entangle/memory/wiki/index.md"],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact.",
        inputSchema: {
          type: "object",
          properties: {
            artifactId: {
              type: "string"
            }
          },
          required: ["artifactId"]
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });
    const result = engineToolExecutionResultSchema.parse({
      content: {
        artifactId: "input-report",
        localPath: "/tmp/entangle/retrieval/input.md",
        preview: "Inbound artifact content."
      },
      isError: false
    });

    expect(observation.message).toBe(
      "Tool returned an explicit bounded error result."
    );
    expect(request.tool.id).toBe("inspect_artifact_input");
    expect(result.isError).toBe(false);
  });
});

describe("runner lifecycle transition helpers", () => {
  it("allows valid canonical transitions", () => {
    expect(isAllowedSessionLifecycleTransition("planning", "active")).toBe(true);
    expect(isAllowedConversationLifecycleTransition("resolved", "closed")).toBe(
      true
    );
    expect(isAllowedApprovalLifecycleTransition("pending", "approved")).toBe(
      true
    );
  });

  it("rejects terminal-state regressions", () => {
    expect(isAllowedSessionLifecycleTransition("completed", "active")).toBe(false);
    expect(isAllowedConversationLifecycleTransition("closed", "working")).toBe(
      false
    );
    expect(isAllowedApprovalLifecycleTransition("approved", "pending")).toBe(
      false
    );
  });
});

describe("nostr transport constants", () => {
  it("keeps the canonical wrapped-event kinds stable", () => {
    expect(entangleNostrGiftWrapKind).toBe(1059);
    expect(entangleNostrRumorKind).toBe(24159);
  });
});

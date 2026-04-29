import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArtifactRef,
  SourceChangeRefProjectionRecord,
  UserConversationProjectionRecord,
  UserNodeConversationResponse,
  UserNodeMessagePublishType,
  UserNodeMessageRecord,
  WikiRefProjectionRecord
} from "@entangle/types";
import {
  chooseConversationId,
  fetchArtifactDiff,
  fetchArtifactHistory,
  fetchArtifactPreview,
  fetchConversationDetail,
  fetchSourceChangeDiff,
  fetchUserClientState,
  formatConversationTimestamp,
  formatDeliveryLabel,
  markConversationRead,
  normalizeApiBaseUrl,
  publishApprovalResponse,
  publishUserMessage,
  renderArtifactLocator,
  reviewSourceChangeCandidate,
  type UserClientState
} from "./runtime-api.js";

const messageTypes: UserNodeMessagePublishType[] = [
  "task.request",
  "question",
  "answer",
  "conversation.close"
];

function isApprovalRequest(message: UserNodeMessageRecord): boolean {
  return (
    message.direction === "inbound" &&
    message.messageType === "approval.request" &&
    message.approval !== undefined
  );
}

function resolveArtifactPreviewNodeId(
  message: UserNodeMessageRecord,
  ref: ArtifactRef
): string {
  if (ref.backend === "wiki") {
    return ref.locator.nodeId;
  }

  return message.direction === "inbound" ? message.fromNodeId : message.toNodeId;
}

function findSourceChangeRef(input: {
  candidateId: string;
  nodeId: string;
  state?: UserClientState | undefined;
}): SourceChangeRefProjectionRecord | undefined {
  return input.state?.sourceChangeRefs.find(
    (ref) => ref.nodeId === input.nodeId && ref.candidateId === input.candidateId
  );
}

function wikiRefMatchesResource(input: {
  ref: WikiRefProjectionRecord;
  resource: NonNullable<UserNodeMessageRecord["approval"]>["resource"];
}): boolean {
  if (!input.resource) {
    return false;
  }

  const locatorPath = input.ref.artifactRef.locator.path;
  const normalizedLocatorPath = locatorPath.replace(/^\/+/u, "");

  return (
    input.resource.id === input.ref.nodeId ||
    input.resource.id === input.ref.artifactId ||
    input.resource.id === locatorPath ||
    input.resource.id === normalizedLocatorPath
  );
}

function SourceSummary({
  sourceRef
}: {
  sourceRef?: SourceChangeRefProjectionRecord | undefined;
}) {
  const summary = sourceRef?.sourceChangeSummary;

  if (!summary) {
    return null;
  }

  return (
    <div className="review-panel">
      <strong>
        {summary.fileCount} files · +{summary.additions} -{summary.deletions}
      </strong>
      {summary.files.length > 0 ? (
        <ul className="compact-list">
          {summary.files.map((file) => (
            <li key={file.path}>
              {file.status} {file.path} +{file.additions} -{file.deletions}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ArtifactPreviewAction({
  artifact,
  baseUrl,
  message
}: {
  artifact: ArtifactRef;
  baseUrl: string;
  message: UserNodeMessageRecord;
}) {
  const [diff, setDiff] = useState<string | undefined>();
  const [historyLines, setHistoryLines] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const nodeId = resolveArtifactPreviewNodeId(message, artifact);

  async function loadPreview(): Promise<void> {
    setStatus("loading preview");
    setDiff(undefined);
    setHistoryLines([]);

    try {
      const response = await fetchArtifactPreview({
        artifactId: artifact.artifactId,
        baseUrl,
        conversationId: message.conversationId,
        nodeId
      });

      if (response.preview.available) {
        setPreview(response.preview.content);
        setStatus(`${response.source} preview`);
      } else {
        setPreview(undefined);
        setStatus(response.preview.reason);
      }
    } catch (error) {
      setPreview(undefined);
      setStatus(error instanceof Error ? error.message : "Preview failed.");
    }
  }

  async function loadHistory(): Promise<void> {
    setStatus("loading history");
    setDiff(undefined);
    setPreview(undefined);

    try {
      const response = await fetchArtifactHistory({
        artifactId: artifact.artifactId,
        baseUrl,
        conversationId: message.conversationId,
        nodeId
      });

      if (response.history.available) {
        setHistoryLines(
          response.history.commits.map(
            (commit) => `${commit.abbreviatedCommit} ${commit.subject}`
          )
        );
        setStatus(`${response.source} history`);
      } else {
        setHistoryLines([]);
        setStatus(response.history.reason);
      }
    } catch (error) {
      setHistoryLines([]);
      setStatus(error instanceof Error ? error.message : "History failed.");
    }
  }

  async function loadDiff(): Promise<void> {
    setStatus("loading diff");
    setHistoryLines([]);
    setPreview(undefined);

    try {
      const response = await fetchArtifactDiff({
        artifactId: artifact.artifactId,
        baseUrl,
        conversationId: message.conversationId,
        nodeId
      });

      if (response.diff.available) {
        setDiff(response.diff.content);
        setStatus(`${response.source} diff`);
      } else {
        setDiff(undefined);
        setStatus(response.diff.reason);
      }
    } catch (error) {
      setDiff(undefined);
      setStatus(error instanceof Error ? error.message : "Diff failed.");
    }
  }

  return (
    <div className="artifact-actions">
      <button onClick={() => void loadPreview()} type="button">
        Preview
      </button>
      <button onClick={() => void loadHistory()} type="button">
        History
      </button>
      <button onClick={() => void loadDiff()} type="button">
        Diff
      </button>
      {status ? <span className="metadata">{status}</span> : null}
      {preview ? <pre className="preview-block">{preview}</pre> : null}
      {historyLines.length > 0 ? (
        <ul className="compact-list">
          {historyLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {diff ? <pre className="preview-block">{diff}</pre> : null}
    </div>
  );
}

function SourceChangeReview({
  baseUrl,
  message,
  onRefresh,
  state
}: {
  baseUrl: string;
  message: UserNodeMessageRecord;
  onRefresh: () => Promise<void>;
  state?: UserClientState | undefined;
}) {
  const resource = message.approval?.resource;
  const [diff, setDiff] = useState<string | undefined>();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | undefined>();

  if (resource?.kind !== "source_change_candidate") {
    return null;
  }

  const candidateId = resource.id;
  const sourceRef = findSourceChangeRef({
    candidateId,
    nodeId: message.fromNodeId,
    state
  });
  const reviewDisabled =
    sourceRef?.status !== undefined && sourceRef.status !== "pending_review";

  async function loadDiff(): Promise<void> {
    setStatus("loading diff");

    try {
      const response = await fetchSourceChangeDiff({
        baseUrl,
        candidateId,
        nodeId: message.fromNodeId
      });

      if (response.diff.available) {
        setDiff(response.diff.content);
        setStatus(`${response.source} diff`);
      } else {
        setDiff(undefined);
        setStatus(response.diff.reason);
      }
    } catch (error) {
      setDiff(undefined);
      setStatus(error instanceof Error ? error.message : "Diff load failed.");
    }
  }

  async function review(statusValue: "accepted" | "rejected"): Promise<void> {
    setStatus(undefined);

    try {
      const response = await reviewSourceChangeCandidate({
        baseUrl,
        candidateId,
        conversationId: message.conversationId,
        nodeId: message.fromNodeId,
        parentMessageId: message.eventId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        sessionId: message.sessionId,
        status: statusValue,
        turnId: message.turnId
      });

      setStatus(
        response.deliveryStatus === "failed"
          ? `recorded ${response.eventId}; relay delivery failed`
          : response.deliveryStatus === "partial"
            ? `published ${response.eventId} to ${response.publishedRelays.length}/${response.relayUrls.length} relays`
            : `published ${response.eventId}`
      );
      await onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Review failed.");
    }
  }

  return (
    <div className="review-panel">
      <strong>source change {candidateId}</strong>
      <SourceSummary sourceRef={sourceRef} />
      <div className="review-actions">
        <button onClick={() => void loadDiff()} type="button">
          Load diff
        </button>
        <input
          aria-label="Review reason"
          disabled={reviewDisabled}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Review reason"
          value={reason}
        />
        <button
          disabled={reviewDisabled}
          onClick={() => void review("accepted")}
          type="button"
        >
          Accept
        </button>
        <button
          className="danger"
          disabled={reviewDisabled}
          onClick={() => void review("rejected")}
          type="button"
        >
          Reject
        </button>
      </div>
      {status ? <div className="metadata">{status}</div> : null}
      {diff ? <pre className="preview-block">{diff}</pre> : null}
    </div>
  );
}

function WikiResourceCards({
  message,
  state
}: {
  message: UserNodeMessageRecord;
  state?: UserClientState | undefined;
}) {
  const resource = message.approval?.resource;
  const refs =
    resource?.kind === "wiki_repository" || resource?.kind === "wiki_page"
      ? (state?.wikiRefs ?? []).filter(
          (ref) =>
            ref.nodeId === message.fromNodeId &&
            wikiRefMatchesResource({ ref, resource })
        )
      : [];

  if (refs.length === 0) {
    return null;
  }

  return (
    <div className="artifact-list">
      {refs.map((ref) => (
        <div className="artifact-card" key={ref.artifactId}>
          <strong>{ref.artifactId}</strong>
          <span>{ref.artifactRef.contentSummary}</span>
          <span>{renderArtifactLocator(ref.artifactRef)}</span>
          {ref.artifactPreview?.available ? (
            <pre className="preview-block">{ref.artifactPreview.content}</pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RuntimeStatus({ state }: { state: UserClientState }) {
  return (
    <dl className="runtime-grid">
      <div>
        <dt>User Node</dt>
        <dd>{state.userNodeId}</dd>
      </div>
      <div>
        <dt>Graph</dt>
        <dd>{state.graphId}</dd>
      </div>
      <div>
        <dt>Identity</dt>
        <dd>{state.runtime.identityPublicKey}</dd>
      </div>
      <div>
        <dt>Relay</dt>
        <dd>{state.runtime.relayUrls.join(", ") || "none"}</dd>
      </div>
    </dl>
  );
}

function ConversationList({
  conversations,
  selectedConversationId,
  onSelect
}: {
  conversations: UserConversationProjectionRecord[];
  onSelect: (conversationId: string) => void;
  selectedConversationId?: string | undefined;
}) {
  if (conversations.length === 0) {
    return <p className="empty">No conversations</p>;
  }

  return (
    <nav className="conversation-list" aria-label="Conversations">
      {conversations.map((conversation) => (
        <button
          className={
            conversation.conversationId === selectedConversationId
              ? "conversation-row selected"
              : "conversation-row"
          }
          key={conversation.conversationId}
          onClick={() => onSelect(conversation.conversationId)}
          type="button"
        >
          <span className="conversation-peer">{conversation.peerNodeId}</span>
          <span>{conversation.lastMessageType ?? conversation.status}</span>
          <span>{formatConversationTimestamp(conversation)}</span>
          <span>
            {conversation.pendingApprovalIds.length} approvals ·{" "}
            {conversation.unreadCount} unread
          </span>
        </button>
      ))}
    </nav>
  );
}

function MessageTimeline({
  baseUrl,
  conversation,
  messages,
  onRefresh,
  state
}: {
  baseUrl: string;
  conversation?: UserConversationProjectionRecord | undefined;
  messages: UserNodeMessageRecord[];
  onRefresh: () => Promise<void>;
  state?: UserClientState | undefined;
}) {
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [busyApprovalId, setBusyApprovalId] = useState<string | undefined>();

  async function decideApproval(
    message: UserNodeMessageRecord,
    decision: "approved" | "rejected"
  ): Promise<void> {
    setBusyApprovalId(message.approval?.approvalId);
    setActionMessage(undefined);

    try {
      await publishApprovalResponse({
        baseUrl,
        decision,
        message
      });
      setActionMessage(`${decision} ${message.approval?.approvalId}`);
      await onRefresh();
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Approval publish failed."
      );
    } finally {
      setBusyApprovalId(undefined);
    }
  }

  if (!conversation) {
    return <p className="empty">No active thread</p>;
  }

  if (messages.length === 0) {
    return <p className="empty">No messages</p>;
  }

  return (
    <div className="timeline">
      {actionMessage ? <div className="notice">{actionMessage}</div> : null}
      {messages.map((message) => (
        <article
          className={`message ${message.direction}`}
          key={message.eventId}
        >
          <header className="message-header">
            <span>{message.messageType}</span>
            <span>{formatDeliveryLabel(message)}</span>
          </header>
          <p>{message.summary}</p>
          {message.approval ? (
            <div className="metadata">
              approval {message.approval.approvalId}
              {message.approval.decision
                ? ` · ${message.approval.decision}`
                : ""}
            </div>
          ) : null}
          {message.sourceChangeReview ? (
            <div className="metadata">
              source review {message.sourceChangeReview.candidateId} ·{" "}
              {message.sourceChangeReview.decision}
            </div>
          ) : null}
          {message.artifactRefs.length > 0 ? (
            <ul className="artifact-list">
              {message.artifactRefs.map((artifact) => (
                <li key={artifact.artifactId}>
                  <strong>{artifact.artifactId}</strong>
                  <span>{artifact.artifactKind ?? artifact.backend}</span>
                  <span>{renderArtifactLocator(artifact)}</span>
                  <ArtifactPreviewAction
                    artifact={artifact}
                    baseUrl={baseUrl}
                    message={message}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <SourceChangeReview
            baseUrl={baseUrl}
            message={message}
            onRefresh={onRefresh}
            state={state}
          />
          <WikiResourceCards message={message} state={state} />
          <footer className="message-footer">
            <span>{message.createdAt}</span>
            <span>{message.eventId}</span>
          </footer>
          {isApprovalRequest(message) ? (
            <div className="approval-actions">
              <button
                disabled={busyApprovalId === message.approval?.approvalId}
                onClick={() => void decideApproval(message, "approved")}
                type="button"
              >
                Approve
              </button>
              <button
                className="danger"
                disabled={busyApprovalId === message.approval?.approvalId}
                onClick={() => void decideApproval(message, "rejected")}
                type="button"
              >
                Reject
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Composer({
  conversation,
  disabled,
  onPublished,
  state,
  baseUrl
}: {
  baseUrl: string;
  conversation?: UserConversationProjectionRecord | undefined;
  disabled: boolean;
  onPublished: () => Promise<void>;
  state?: UserClientState | undefined;
}) {
  const defaultTarget = conversation?.peerNodeId ?? state?.targets[0]?.nodeId ?? "";
  const [messageType, setMessageType] = useState<UserNodeMessagePublishType>(
    conversation ? "answer" : "task.request"
  );
  const [summary, setSummary] = useState("");
  const [targetNodeId, setTargetNodeId] = useState(defaultTarget);
  const [status, setStatus] = useState<string | undefined>();

  useEffect(() => {
    setTargetNodeId(defaultTarget);
    setMessageType(conversation ? "answer" : "task.request");
  }, [conversation, defaultTarget]);

  async function submit(): Promise<void> {
    setStatus(undefined);

    try {
      await publishUserMessage({
        baseUrl,
        draft: {
          ...(conversation?.conversationId
            ? { conversationId: conversation.conversationId }
            : {}),
          messageType,
          ...(conversation?.sessionId ? { sessionId: conversation.sessionId } : {}),
          summary,
          targetNodeId
        }
      });
      setSummary("");
      setStatus("sent");
      await onPublished();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed.");
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="composer-row">
        <label>
          Target
          <select
            disabled={disabled}
            onChange={(event) => setTargetNodeId(event.target.value)}
            required
            value={targetNodeId}
          >
            {(state?.targets ?? []).map((target) => (
              <option key={target.nodeId} value={target.nodeId}>
                {target.nodeId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            disabled={disabled}
            onChange={(event) =>
              setMessageType(event.target.value as UserNodeMessagePublishType)
            }
            value={messageType}
          >
            {messageTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Message
        <textarea
          disabled={disabled}
          onChange={(event) => setSummary(event.target.value)}
          required
          rows={5}
          value={summary}
        />
      </label>
      <div className="composer-actions">
        <button disabled={disabled || !summary.trim() || !targetNodeId}>
          Send
        </button>
        {status ? <span>{status}</span> : null}
      </div>
    </form>
  );
}

export function App() {
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(import.meta.env.VITE_ENTANGLE_USER_CLIENT_BASE_URL),
    []
  );
  const [state, setState] = useState<UserClientState | undefined>();
  const [conversation, setConversation] = useState<
    UserNodeConversationResponse | undefined
  >();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const selectedConversation = state?.conversations.find(
    (candidate) => candidate.conversationId === selectedConversationId
  );

  const refreshState = useCallback(async () => {
    const nextState = await fetchUserClientState(apiBaseUrl);
    setState(nextState);
    setSelectedConversationId((current) =>
      chooseConversationId({
        conversations: nextState.conversations,
        currentConversationId: current
      })
    );
  }, [apiBaseUrl]);

  const refreshConversation = useCallback(async () => {
    if (!selectedConversationId) {
      setConversation(undefined);
      return;
    }

    setConversation(
      await fetchConversationDetail({
        baseUrl: apiBaseUrl,
        conversationId: selectedConversationId
      })
    );
  }, [apiBaseUrl, selectedConversationId]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(undefined);

      try {
        const nextState = await fetchUserClientState(apiBaseUrl);

        if (cancelled) {
          return;
        }

        setState(nextState);
        setSelectedConversationId((current) =>
          chooseConversationId({
            conversations: nextState.conversations,
            currentConversationId: current
          })
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Load failed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    const shouldMarkRead = (selectedConversation?.unreadCount ?? 0) > 0;

    async function loadConversation(): Promise<void> {
      if (!selectedConversationId) {
        setConversation(undefined);
        return;
      }

      try {
        const nextConversation = await fetchConversationDetail({
          baseUrl: apiBaseUrl,
          conversationId: selectedConversationId
        });

        if (!cancelled) {
          setConversation(nextConversation);
        }

        if (shouldMarkRead) {
          await markConversationRead({
            baseUrl: apiBaseUrl,
            conversationId: selectedConversationId
          });

          if (!cancelled) {
            const nextState = await fetchUserClientState(apiBaseUrl);
            setState(nextState);
            setSelectedConversationId((current) =>
              chooseConversationId({
                conversations: nextState.conversations,
                currentConversationId: current
              })
            );
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Conversation load failed."
          );
        }
      }
    }

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, selectedConversation?.unreadCount, selectedConversationId]);

  async function refreshAll(): Promise<void> {
    await refreshState();
    await refreshConversation();
  }

  return (
    <main className="user-client-shell">
      <header className="topbar">
        <div>
          <h1>Entangle User Client</h1>
          <p>{state ? `${state.userNodeId} · ${state.graphId}` : "connecting"}</p>
        </div>
        <button onClick={() => void refreshAll()} type="button">
          Refresh
        </button>
      </header>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="workspace">
        <aside className="sidebar">
          {state ? (
            <>
              <RuntimeStatus state={state} />
              <ConversationList
                conversations={state.conversations}
                onSelect={setSelectedConversationId}
                selectedConversationId={selectedConversationId}
              />
            </>
          ) : (
            <p className="empty">{loading ? "Loading" : "Unavailable"}</p>
          )}
        </aside>
        <section className="thread">
          <div className="thread-header">
            <div>
              <h2>{selectedConversation?.peerNodeId ?? "Thread"}</h2>
              <p>{selectedConversationId ?? "No conversation selected"}</p>
            </div>
            {selectedConversation ? (
              <span className="status">{selectedConversation.status}</span>
            ) : null}
          </div>
          <MessageTimeline
            baseUrl={apiBaseUrl}
            conversation={selectedConversation}
            messages={conversation?.messages ?? []}
            onRefresh={refreshAll}
            state={state}
          />
          <Composer
            baseUrl={apiBaseUrl}
            conversation={selectedConversation}
            disabled={!state || (state.targets.length === 0 && !selectedConversation)}
            onPublished={refreshAll}
            state={state}
          />
        </section>
      </div>
    </main>
  );
}

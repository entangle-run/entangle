# Entangle Wiki Log

## [2026-04-29] tooling | Added active product naming guardrail

Added `pnpm ops:check-product-naming`, which scans active product surfaces
(`README.md`, apps, deploy material, examples, packages, scripts, services,
and `package.json`) for obsolete local product/profile labels. Historical
reference and release material remains outside this active-surface gate so it
can be archived or rewritten intentionally.

Added `references/378-active-product-naming-guardrail-slice.md`.

## [2026-04-29] verification | Added fake OpenAI-compatible provider smoke

Added `pnpm ops:smoke-fake-openai-provider`. The smoke starts the
deterministic OpenAI-compatible provider on an ephemeral port, verifies health,
model listing, non-streaming chat completions, streaming chat completions, and
streaming Responses API frames, then stops the spawned provider process.

Added `references/377-fake-provider-smoke-slice.md`.

## [2026-04-29] implementation | Added conversation-aware working-context memory

The durable runner-owned `working-context.md` summary now includes a
`Conversation Routes` section derived from the current session snapshot. It
records active conversation ids and bounded peer/status/response-policy,
follow-up, artifact-count, and last-message metadata so delegated sessions can
resume from typed coordination context without copying peer transcripts into
node memory.

Added `references/376-conversation-aware-working-context-memory-slice.md`.

## [2026-04-29] tooling | Added deterministic OpenAI-compatible dev provider

Added `pnpm ops:fake-openai-provider`, an operator-started deterministic
OpenAI-compatible HTTP server for no-credential manual integration tests. It
serves `/v1/models`, `/v1/chat/completions`, and `/v1/responses`, validates a
bearer token by default, and supports streaming chat-completions and Responses
API shapes so catalog/auth/adapter/UI wiring can be exercised without live
model-provider credentials.

Added `references/375-deterministic-openai-provider-dev-server-slice.md`.

## [2026-04-29] implementation | Added handoff-aware working-context memory

Model-guided runner memory synthesis now receives bounded current-turn handoff
evidence from `RunnerTurnRecord.emittedHandoffMessageIds`. The durable
`working-context.md` page now carries a deterministic `Handoff Context`
section with emitted handoff message ids, preserving delegation evidence
without copying peer conversations or logs into node memory.

Added `references/374-handoff-aware-working-context-memory-slice.md`.

## [2026-04-29] implementation | Added mounted-file runtime identity support

Runtime-context runner startup now uses the shared runner secret-delivery
helper, so node identity secrets can be delivered through mounted files as well
as environment variables. The Human Interface Runtime uses the same helper when
creating its own Nostr transport, preserving best-effort startup when identity
material is unavailable. Added runner coverage for a mounted-file runtime
identity secret.

Added `references/373-mounted-file-runtime-identity-slice.md`.

## [2026-04-29] verification | Added deterministic OpenAI-compatible provider fixture

Added a package-local fake OpenAI-compatible HTTP provider for
`@entangle/agent-engine` tests. The fixture validates bearer tokens, records
chat-completions requests, and returns deterministic success, tool-call, and
error responses. The agent-engine tests now exercise the real `fetch` provider
path for plain chat completion, tool-loop continuation, and HTTP 429
classification without requiring live model credentials.

Added `references/372-openai-compatible-fake-provider-fixture-slice.md`.

## [2026-04-29] tooling | Added host smoke script lint coverage

Extended `@entangle/host` lint to cover TypeScript host smoke scripts and added
`services/host/scripts/*.ts` to typed ESLint project coverage. Fixed the
process-runner smoke lint issues found by that gate: dynamic import type
annotations, relay preflight frame narrowing, and projected git artifact
locator access.

Added `references/371-host-smoke-script-lint-coverage-slice.md`.

## [2026-04-29] docs | Realigned User Node approval surface status

Updated active User Node and Studio/CLI specs so they no longer describe
already-removed direct Host approval/review mutation paths as open work. The
current actor boundary is signed User Node messages for participant approval
and source review, with Studio kept on operator inspection and assignment.

Added `references/370-user-node-approval-doc-realignment-slice.md`.

## [2026-04-29] verification | Covered User Node signer audit in process smoke

Extended the process-runner smoke so signer pubkey preservation is verified
for User Node publish responses, Host inbox records, User Client conversation
records, source-change review, approval response, synthetic inbound
agent-to-user messages, and the second User Node publish path.

Added `references/369-process-smoke-user-node-signer-audit-slice.md`.

## [2026-04-29] implementation | Surfaced User Node signer audit state

Added compact CLI projection for recorded User Node messages with signer
pubkey and signer/fromPubkey match status, included compact message summaries
in `entangle inbox show --summary`, and rendered short signer labels in the
dedicated User Client timeline when signer metadata is available.

Added `references/368-user-node-signer-surface-slice.md`.

## [2026-04-29] implementation | Verified NIP-59 seal signer for runner A2A

Replaced direct runner A2A `nip59.unwrapEvent` receive handling with an
explicit verified unwrap path that decrypts the gift wrap, verifies the NIP-59
seal event signature, decrypts the rumor through that seal signer, validates
the rumor hash, and requires seal signer, rumor pubkey, and payload
`fromPubkey` to match.

Added `references/367-nip59-seal-signer-verification-slice.md`.

## [2026-04-29] implementation | Added User Node inbox signer audit

Added optional signer pubkey metadata to User Node inbound requests, publish
responses, and durable message records. The Human Interface Runtime now
forwards inbound envelope signer metadata to Host, and Host rejects inbound
User Node message records when the signer does not match the payload
`fromPubkey`.

Added `references/366-user-node-inbox-signer-audit-slice.md`.

## [2026-04-29] implementation | Hardened runner A2A signer handling

Added signer pubkey metadata to runner A2A envelopes. The Nostr runner
transport now drops gift-wrapped A2A messages when the unwrapped rumor signer
does not match the payload `fromPubkey`, and runner service handling rejects
direct envelopes with signer/fromPubkey mismatch before runtime state mutation.
Approval request/response lineage now uses the envelope signer when available.

Added `references/365-runner-a2a-signer-hardening-slice.md`.

## [2026-04-29] implementation | Enforced approval approver sets

Updated the runner approval-response path so a matching `approval.response`
only transitions an approval gate when the sender node is listed in the
approval record's approver set. Unauthorized matching responses can remain
conversation traffic but no longer approve, reject, close, or fail the gated
session.

Added `references/364-approval-approver-enforcement-slice.md`.

## [2026-04-29] implementation | Added approval message lineage

Extended `ApprovalRecord` with optional request/response event ids, signer
pubkeys, and source message id metadata. The runner now stamps engine-created
approval gates, inbound approval requests, and applied approval responses with
that bounded signed-message lineage where available, and shared approval detail
formatting exposes the fields.

Added `references/363-approval-message-lineage-slice.md`.

## [2026-04-29] implementation | Added source-change memory carry-forward

Added a runner-owned `Source Change Context` section to the generated
`working-context.md` memory summary. The section carries bounded source-change
candidate ids, totals, changed-file summaries, preview metadata, and diff
availability while keeping raw diffs and full preview contents out of durable
memory.

Added `references/362-source-change-memory-carry-forward-slice.md`.

## [2026-04-29] implementation | Added source-change-aware memory synthesis

Passed the completed runner turn record into optional model-guided memory
synthesis and added a bounded source-change evidence prompt section with
candidate ids, totals, changed-file summaries, preview metadata, and diff
availability. The prompt explicitly keeps raw diffs and full file previews out
of durable node memory.

Added `references/361-source-change-aware-memory-synthesis-slice.md`.

## [2026-04-29] implementation | Added User Client source file preview

Added a conversation-scoped runtime-local source-change file preview route to
the Human Interface Runtime and wired the dedicated User Client review panel to
load changed-file previews before source-candidate review. The process-runner
smoke now verifies the running User Client can load the modified smoke source
file through the same selected-conversation visibility gate.

Added `references/360-user-client-source-file-preview-slice.md`.

## [2026-04-29] verification | Proved User Client source diff in process smoke

Extended the process-runner smoke so the running User Client loads the visible
source-change diff with selected-conversation context before publishing the
signed source-candidate review message.

Added `references/359-process-smoke-user-client-source-diff-slice.md`.

## [2026-04-29] implementation | Scoped User Client source-change review to conversations

Tightened runtime-local User Client source-change diff and review routes so
they require selected-conversation context and verify matching
approval-resource or projected session evidence before returning diff evidence
or publishing a signed review message.

Added
`references/358-user-client-source-change-visibility-boundary-slice.md`.

## [2026-04-29] verification | Proved User Client artifact history/diff in process smoke

Extended the process-runner smoke so the real builder-published source-history
git artifact is delivered to the User Node conversation, then inspected through
the running User Client artifact history/diff JSON routes with conversation
context.

Added
`references/357-process-smoke-user-client-artifact-history-diff-slice.md`.

## [2026-04-29] implementation | Scoped User Client artifact reads to conversations

Tightened runtime-local User Client artifact preview/history/diff routes so
they require a conversation id and verify the artifact ref is visible in that
User Node conversation before proxying to Host artifact read APIs. The
dedicated User Client now passes conversation context for artifact actions.

Added `references/356-user-client-artifact-visibility-boundary-slice.md`.

## [2026-04-29] implementation | Added User Client artifact history and diff

Added runtime-local User Client JSON routes for artifact history and artifact
diff, backed by the Host artifact read APIs. The dedicated User Client now
shows Preview, History, and Diff actions for artifact refs so human graph
participants can inspect git-backed artifact evidence from their running User
Node client.

Added `references/355-user-client-artifact-history-diff-slice.md`.

## [2026-04-29] implementation | Surfaced artifact cache status in Studio

Added the path-free artifact backend cache summary to Studio's Host Status
panel using the shared host-client formatter, keeping CLI and Studio operator
vocabulary aligned while leaving cache mutation on the Host API/CLI path.

Added `references/354-studio-artifact-cache-status-slice.md`.

## [2026-04-29] implementation | Added artifact backend cache clear control

Added an operator Host API and CLI command to dry-run or clear the derived
artifact backend cache used for projected git artifact history/diff. The
operation reports repository count and byte size while deleting only cache
repository directories, not authoritative artifact, projection, runner, or git
backend state.

Added `references/353-artifact-backend-cache-clear-slice.md`.

## [2026-04-29] implementation | Exposed artifact backend cache status

Added bounded Host status metadata for the derived artifact backend cache used
to resolve projected git artifact history/diff. Host, shared host-client, CLI
presentation tests, and type contracts now cover cache availability,
repository count, and byte size without exposing Host filesystem paths.

Added `references/352-artifact-backend-cache-status-slice.md`.

## [2026-04-29] verification | Proved backend artifact history and diff in process smoke

Extended the federated process-runner smoke so the real Host plus joined runner
path now checks Host backend-cache artifact history/diff for the source-history
git artifact published by the runner. The smoke prints
`backend-resolved-artifact-history-diff` only when both history and diff are
available through the configured git backend.

Added `references/351-process-smoke-artifact-backend-history-diff-slice.md`.

## [2026-04-28] implementation | Resolved federated artifact history and diff from git backends

Added Host-owned backend-cache resolution for projected git artifact
history/diff reads. When an accepted federated runtime emits an `artifact.ref`
with service, namespace, repository, commit, and path metadata, Host can now
clone/fetch the configured git backend under `host/cache` and compute bounded
history/diff without reading runner-local runtime files.

Added `references/350-federated-artifact-backend-history-diff-slice.md`.

## [2026-04-28] implementation | Quarantined federated runtime filesystem reads

Added a Host filesystem-context boundary so public deep runtime read paths no
longer read Host-local `runtimeRoot` records for accepted federated
assignments. Artifacts, memory, approvals, source-change candidates,
source-history records, and turns now use runner projection for federated
runtimes while preserving filesystem reads for non-federated adapters.

Added `references/349-federated-runtime-filesystem-read-quarantine-slice.md`.

## [2026-04-28] verification | Covered wiki publication in process smoke

Extended the federated process-runner smoke so the real Host plus joined runner
path now requests runner-owned wiki publication through Host-signed
`runtime.wiki.publish`, waits for projected git `artifact.ref` evidence, and
verifies the primary git backend branch head matches the projected commit.

Added `references/348-process-smoke-wiki-publication-control-slice.md`.

## [2026-04-28] verification | Covered assignment timeline in process smoke

Extended the federated process-runner smoke so the real joined runner path now
checks `/v1/assignments/:assignmentId/timeline` after lifecycle receipts. The
smoke asserts assignment acceptance plus runner `started` receipt evidence from
the timeline read model.

Added `references/344-process-smoke-assignment-timeline-slice.md`.

## [2026-04-28] implementation | Added assignment timeline read model

Added a Host-backed assignment timeline read model that joins assignment
lifecycle state with projected runner receipts. Host API, shared host-client,
CLI `assignments timeline`, and Studio assignment rows now expose grouped
assignment progress without reading runner-local state.

Added `references/343-assignment-timeline-read-model-slice.md`.

## [2026-04-28] implementation | Added projected source-history replay outcomes

Added typed Host projection records for runner-observed
`source_history.replayed` outcomes. Host now exposes replay list/detail read
APIs, the shared host-client and CLI can inspect replay outcomes, and Studio's
Federation summary includes projected replay counts without reading
runner-local replay files.

Added
`references/342-projected-source-history-replay-read-model-slice.md`.

## [2026-04-28] implementation | Added Studio source-history replay requests

Added a Studio selected-runtime source-history replay form that calls the
federated Host request path instead of mutating runner workspaces. Operators can
provide optional approval id, reason, replay id, and requester metadata; Studio
shows the Host command as requested while replay completion remains assignment
receipt and `source_history.replayed` evidence.

Added `references/341-studio-source-history-replay-control-slice.md`.

## [2026-04-28] implementation | Added federated source-history replay control

Added Host-signed `runtime.source_history.replay` control delivery for explicit
source-history replay. Host now publishes a request to the accepted federated
assignment instead of writing runner workspaces; the owning runner validates
source-application approval policy, refuses diverged source trees, persists
runner-owned replay records, and emits `source_history.replayed` observations
plus assignment receipts for outcome evidence.

Added `references/340-federated-source-history-replay-control-slice.md`.

## [2026-04-28] implementation | Added federated source-history publication control

Added Host-signed `runtime.source_history.publish` control delivery for
explicit source-history publication and failed-publication retry. Host now only
requests the operation for accepted federated assignments; the owning runner
reads runner-owned source-history state, performs the git publication, emits
artifact/source-history observations, and records assignment receipts for
operator outcome evidence.

Added
`references/339-federated-source-history-publication-control-slice.md`.

## [2026-04-28] implementation | Added federated session cancellation control

Moved the primary session cancellation delivery path from Host-written runner
filesystem records to a signed `runtime.session.cancel` control command for
accepted federated assignments. The generic runner forwards the command to the
running assignment runtime, and RunnerService persists/applies it under
runner-owned state while preserving existing CLI/Studio/host-client cancel
surfaces.

Added `references/337-federated-session-cancellation-control-slice.md`.

## [2026-04-28] implementation | Removed Host artifact restore and promotion

Removed the direct Host artifact restore and promotion routes, host-client
methods, CLI commands, and Studio controls. Artifact inspection remains
available through list/detail/preview/history/diff read surfaces, while future
restore or source-promotion behavior must return as runner-owned protocol work
or source-change proposals.

Added `references/336-host-artifact-restore-promotion-removal-slice.md` and
marked the old Host-mediated restore/promotion docs as superseded.

## [2026-04-28] implementation | Removed Host wiki publication

Removed the direct Host wiki repository publication/list routes, host-client
methods, CLI `wiki-publications` / `wiki-publish` commands, and Studio Runtime
Memory publish/retry controls. Wiki inspection now stays on the federated path:
runner-owned wiki sync emits signed `wiki.ref` observations, and Host exposes
projection-backed read surfaces instead of publishing runner-local filesystem
state.

Added `references/335-host-wiki-publication-removal-slice.md` and marked the
older Host-mediated wiki publication/retry docs as superseded.

## [2026-04-28] implementation | Removed Host source apply and replay mutations

Removed the direct Host source-candidate apply mutation, source-history replay
mutation/list routes, host-client methods, CLI commands, and Studio controls.
Source application is now exposed publicly through signed User Node review and
runner-owned source-history behavior; explicit replay must return as a
runner-owned protocol command instead of Host filesystem mutation.

Added
`references/334-host-source-application-replay-removal-slice.md` and marked the
older direct source-history replay slice as superseded.

## [2026-04-28] implementation | Removed Host source-history publication

Removed the direct Host source-history publication mutation, host-client method,
CLI `source-history-entry --publish` path, and Studio publish/retry action.
Source-history publication is now runner-owned: Host observes published
artifact/source-history refs instead of reading runner runtime files to push a
commit.

Added `references/333-host-source-history-publication-removal-slice.md` and
marked the older Host-mediated publication slice docs as superseded.

## [2026-04-28] implementation | Runner-owned source history publication

Moved the default source-history publication path into the owning runner for
accepted signed source-candidate reviews. When a primary git target is
configured and source publication does not require extra approval, the runner
materializes the source-history commit as a git artifact, pushes it to the
primary target, records publication metadata locally, and emits both
`artifact.ref` and updated `source_history.ref` observations.

Added `references/332-runner-owned-source-history-publication-slice.md`. The
process-runner smoke now requires the projected source-history record to show a
published publication state.

## [2026-04-28] implementation | Projected runner source history refs

Added signed `source_history.ref` observations for runner-owned source-history
applications. Accepted source-candidate reviews now let the runner emit both
the updated `source_change.ref` and the concrete `SourceHistoryRecord`; Host
records that into projection state and can serve source-history list/detail
read APIs from projection when it has no runner-local filesystem context.

Added `references/331-projected-source-history-ref-slice.md`. CLI projection
summaries and Studio federation metrics now include projected source-history
ref counts.

## [2026-04-28] implementation | Removed direct Host approval and review APIs

Removed the remaining Host and shared host-client mutation APIs for direct
runtime approval decisions and source-candidate reviews. Approval responses and
source reviews now have only the signed User Node A2A path as their canonical
implementation path.

Removed the `source_change_candidate.reviewed` Host event schema and runtime
trace prefix. Review history is represented by User Node message history plus
runner-observed `source_change.ref` projection. Added
`references/323-direct-host-approval-review-api-removal-slice.md`.

## [2026-04-28] implementation | Quarantined public direct approval and review mutations

Studio and CLI no longer expose public operator actions for direct Host-side
approval decisions or source-candidate reviews. Runtime approval and source
candidate panels remain available for admin inspection, while approval
responses and source reviews are submitted through signed User Node message
paths.

Added `references/322-public-direct-mutation-surface-quarantine-slice.md`.
CLI now includes `entangle review-source-candidate` and generic
`entangle user-nodes message --message-type source_change.review` support for
signed source-candidate review messages.

## [2026-04-28] implementation | Signed User Node source-candidate reviews

User Client source-change accept/reject now publishes signed
`source_change.review` A2A messages instead of calling the Host runtime
candidate review mutation. The owning runner applies the review to
runner-owned source-change candidate state, stamps the deciding User Node, and
emits a fresh `source_change.ref` observation for Host projection.

Added `references/321-signed-source-candidate-review-slice.md` and updated the
federated runtime plan to treat source-candidate review as a participant
message path. The process-runner smoke now verifies this through the running
User Client JSON API. The older Host source-candidate review mutation remains
only as a non-canonical compatibility/admin path pending removal with the other
direct mutation routes.

## [2026-04-26] implementation | Enforced joined runner assignment capacity

`RunnerJoinService` now rejects new assignment offers once the runner has
reached its advertised `maxAssignments` capacity. This keeps the runner-side
assignment model consistent with the capability record it sends in
`runner.hello` and prevents accidental multi-assignment startup when the runner
was configured for a single node runtime.

## [2026-04-26] verification | Added separate process runner federated smoke

Added `references/254-process-runner-federated-smoke-slice.md` and
`pnpm ops:smoke-federated-process-runner`. The smoke starts a real Host HTTP
server with federated control-plane transport, then launches a generic joined
runner as a separate OS process against the same relay. The runner registers,
is trusted, receives a Host-signed assignment, fetches Host API bootstrap
context, materializes runner-owned workspace paths, starts the assigned node
runtime, and reports signed runtime status back through the relay.

The runner materializer now localizes fetched runtime context into its own
assignment workspace, can opt into authenticated Host API runtime identity
secret bootstrap, and does not write the secret into the context file. Host JSON
state writes now use atomic temp-file-and-rename persistence after the process
smoke exposed a partial-read race during rapid runtime status observations.

## [2026-04-26] implementation | Added runtime evidence to diagnostics bundle

Deepened `entangle deployment diagnostics` with bounded per-runtime evidence from
existing host surfaces. The support bundle now includes turn counts, latest
turn summaries, redacted engine failure classification/messages, permission
decisions, pending approval ids, and artifact counts for each runtime when the
host is reachable.

## [2026-04-26] implementation | Added Local reliability smoke

Added `pnpm ops:smoke-federated-dev:reliability` for initialized Entangle
profiles. The smoke creates a temporary `entangle deployment backup` bundle,
validates `entangle deployment restore --dry-run`, checks `entangle deployment repair
--skip-live --json`, and removes the temporary backup bundle after the check.

## [2026-04-26] implementation | Added conservative Local repair foundation

Advanced Entangle L4 reliability with `entangle deployment repair`. The command
runs the Local doctor, builds a conservative repair plan, defaults to dry-run
output, and applies only actions marked safe when `--apply-safe` is supplied.

The first safe actions initialize the `.entangle/host` directory skeleton or
stamp a missing current `state-layout.json` marker. Applied repairs write a
schema-versioned trace record under `.entangle/host/traces/local-repairs`.
Unsupported future, unsupported legacy, and unreadable layout records remain
blocked/manual rather than mutated.

## [2026-04-26] implementation | Added Local backup and restore foundation

Advanced Entangle L4 reliability with `entangle deployment backup` and
`entangle deployment restore`. Backups now create a schema-versioned directory
bundle containing `.entangle/host`, selected Federated dev profile config snapshots,
copy statistics, package metadata, state-layout status, and explicit exclusions
for `.entangle-secrets` and external service state.

Restore now validates the manifest and bundled `state-layout.json`, supports
`--dry-run`, refuses incompatible Entangle state layout versions, and refuses to
replace an existing `.entangle/host` without `--force`. Focused CLI coverage
exercises backup creation, dry-run restore, clean restore, secret exclusion,
and unsupported-future layout rejection.

## [2026-04-26] implementation | Added diagnostics bundle smoke

Added `pnpm ops:smoke-federated-dev:diagnostics` for already-running Entangle
profiles. The smoke runs `entangle deployment diagnostics`, writes a temporary
redacted JSON support bundle, validates the stable top-level shape, and removes
the temporary bundle after the check.

## [2026-04-26] implementation | Added Local diagnostics support bundle

Advanced Entangle C5 by adding `entangle deployment diagnostics`, a read-only
CLI command that writes a schema-versioned JSON support bundle. The bundle
includes the Local doctor report, bounded Docker Compose service status and
log captures, runner-image inspection, and live host status, runtime,
external-principal, and recent-event state when the host is reachable.

Captured command output is bounded and redacted for common bearer token,
authorization, token, secret, password, and API-key shapes before it is written.
The remaining C5 work is a smoke around bundle generation, deeper OpenCode
failure extraction, and release-run attachment guidance.

## [2026-04-26] implementation | Added Entangle state layout compatibility checks

Advanced the Entangle reliability track by introducing a version-1
`.entangle/host/state-layout.json` marker for host-owned Entangle state. The host
now materializes the marker on first startup and refuses unreadable,
unsupported legacy, or unsupported future layout records before mutating state.

`GET /v1/host/status` now exposes machine-readable state layout status. The
shared host-client formatter, CLI host status summary, Studio Host Status
panel, and `entangle deployment doctor` consume the same status; the doctor also
checks offline Entangle state layout compatibility when the host is not running.

Verification covered focused typecheck/lint/tests for the touched packages and
passed `CI=1 TURBO_DAEMON=false pnpm verify`.

## [2026-04-26] implementation | Installed OpenCode in the runner image

Closed a concrete OpenCode availability gap for Entangle: the default
node engine is OpenCode, so the federated dev runner image now installs pinned
`opencode-ai@1.14.20` and verifies `opencode --version` during image build.
At the time of the slice, the pin matched the OpenCode resource checkout at
`0595c289046d7f45d82a563ad0c76b3ccfca050b`.

`entangle deployment doctor` now also checks `opencode --version` inside the
configured runner image, so the diagnostic verifies availability where runner
turns execute, not only on the host PATH.

Verification included `npm view opencode-ai@1.14.20 version`, focused CLI
typecheck/lint/tests, a Docker build of the runner runtime target tagged
`entangle-runner:opencode-local-check`, and a container-level
`opencode --version` run returning `1.14.20`.

## [2026-04-26] implementation | Surfaced runtime approval blockers and artifacts

Advanced Entangle B8 runtime visibility by adding generic
`agentRuntime` inspection fields for pending approval blocker ids, the latest
engine turn's produced artifact ids, and the latest engine turn's requested
approval ids. The host derives those fields from runner turn and approval
records rather than engine-specific OpenCode internals.

The shared host-client formatter, CLI runtime summaries, and Studio runtime
details now expose the same host truth, so operators can see what a coding node
is blocked on and which artifacts its latest engine turn produced without
opening separate turn or approval panels first.

Focused verification covered typecheck for types, host, host-client, and
Studio, plus focused contract, host, host-client, and CLI tests.

## [2026-04-26] implementation | Materialized engine-requested approval gates

Advanced Entangle B7/B3 by extending the OpenCode `entangle-actions`
bridge beyond handoffs. `AgentEngineTurnResult` now accepts generic
`approvalRequestDirectives`, the OpenCode adapter validates those directives
from bounded action blocks, and runner turns record `requestedApprovalIds`.

When an engine asks for approval, the runner now writes a pending approval
record with operation/resource evidence, moves the active session to
`waiting_approval`, moves the active conversation to `awaiting_approval`, and
does not publish a task result while the gate is pending. This keeps Entangle
policy and lifecycle state authoritative without giving the coding engine
direct authority over the gated side effect.

Focused verification covered types contracts, OpenCode action parsing, and the
runner lifecycle path for approval-request directives. Live OpenCode
permission pause/resume and post-approval engine resumption remain open B3/B7
work.

## [2026-04-25] implementation | Added operator scoped approval decisions

Advanced Entangle L3 approval governance with an explicit host mutation
for runtime approval decisions. `POST /v1/runtimes/{nodeId}/approvals` can now
create a new operation/resource-scoped approval decision for source mutation
workflows or decide an existing pending approval without respecifying its
scope. The mutation writes the runtime approval record, synchronizes observed
approval activity, and emits `approval.trace.event`.

The shared host client now exposes `recordRuntimeApprovalDecision`, the CLI
adds `entangle host runtimes approval-decision`, and Studio can approve or
reject a selected pending approval from the runtime detail panel. Added
`references/208-operator-scoped-approval-decisions-slice.md`.

Focused typecheck passed for types, host, host-client, CLI, and Studio. Focused
contract, host-client, host approval-decision, CLI approval, and Studio approval
tests passed, followed by full touched-package tests and lint. `git diff
--check`, `pnpm build`, and `CI=1 TURBO_DAEMON=false pnpm verify` also passed;
build still reports only the known Studio chunk-size warning. A first host run
found an invalid generated approval id edge case; approval ids now use a
bounded prefix plus UUID.

## [2026-04-25] implementation | Added Local doctor foundation

Started Entangle L4 reliability workstream C1 with a read-only
`entangle deployment doctor` command. The command reports severity-ranked Local
profile diagnostics in human-readable or JSON form and supports `--strict` for
release/smoke preparation plus `--skip-live` for offline checks.

The first doctor checks required Federated dev profile files, Node 22+, `pnpm`, Docker,
Docker Compose, Docker daemon, Federated dev Compose config, `entangle-runner:federated-dev`,
OpenCode availability, `.entangle/host`, live host status, host-reported
runtime workspace health, git principal records, Studio, Gitea, and the local
relay. Added `references/207-local-doctor-foundation-slice.md`.

Focused CLI typecheck, lint, doctor tests, and offline JSON command execution
passed. `git diff --check`, focused CLI build, full `pnpm build`, and
`CI=1 TURBO_DAEMON=false pnpm verify` also passed; build still reports only the
known Studio chunk-size warning.

## [2026-04-25] implementation | Scoped approvals to operations and resources

Tightened Entangle L3 approval evidence for source mutations. Approval
request metadata, runner approval records, observed approval activity, and
typed approval trace events now carry optional operation and resource scope.
Source-candidate application and source-history publication gates require exact
operation/resource matches before accepting a supplied approval id.

Source application approvals now bind to the concrete source-change candidate,
while source-history publication approvals bind to the source-history entry and
resolved git target tuple. Shared host-client helpers, CLI summaries, Studio
approval inspection, and runtime trace presentation now surface both operation
and resource scope. Added
`references/206-operation-resource-scoped-approvals-slice.md`.

Focused package typecheck/test coverage passed for the touched contracts,
host, runner, host-client, CLI, and Studio packages. `git diff --check`,
`pnpm build`, and `CI=1 TURBO_DAEMON=false pnpm verify` also passed; build
still reports only the known Studio chunk-size warning.

## [2026-04-25] implementation | Added source mutation policy gates

Advanced Entangle L3 workstreams B3 and B5. Graph node bindings now carry
optional `policy.sourceMutation` controls, and effective runtime context exposes
the resolved source mutation policy. Source-candidate apply and source-history
publish mutations now accept `approvalId`; the host requires an approved
runtime approval record when the node policy demands it, and non-primary
source-history publication targets are approval-gated by default.

Accepted approval ids are persisted on source-change candidate application
records, source-history application/publication records, and
`source_history.updated` / `source_history.published` events. CLI, Studio, and
shared host-client presentation now surface source approval evidence. Added
`references/205-source-mutation-policy-gates-slice.md`. Live OpenCode
permission-to-approval mapping, operator-facing scoped approval request
creation, non-primary git provisioning/fallback, artifact restore/replay, and
end-to-end OpenCode-backed smoke coverage remain open.

Focused package lint/typecheck/test checks, `git diff --check`, and `pnpm build`
passed. The aggregate `pnpm verify` and recursive workspace test attempts were
stopped after local no-output hangs inside spawned Vitest child processes; the
same package tests passed when run directly.

## [2026-04-25] implementation | Added source history publication controls

Advanced Entangle L3 workstream B5. Source-history publication now has
explicit retry and git target-selection semantics. The host rejects replacement
of a failed publication attempt unless `retry: true` is supplied, keeps already
published source-history entries immutable, resolves optional git service,
namespace, and repository targets through the runtime artifact context, and
records the resolved target on source-history publication records, git artifact
locators, and `source_history.published` events.

The shared host client, CLI, and Studio now consume the widened contract. CLI
publish commands accept `--retry` and target-selection options, Studio sends a
retry when republishing a failed selected source-history entry, and shared
presentation helpers show publication targets. Added
`references/204-source-history-publication-controls-slice.md`. Source mutation
approval gates were added in a follow-up slice; non-primary
provisioning/fallback behavior, artifact restore/replay semantics, and
end-to-end OpenCode-backed source-publication smoke coverage remain open.

## [2026-04-25] implementation | Added runtime artifact history and diff inspection

Advanced Entangle L3 workstream B5. Materialized git-backed runtime
artifacts now expose bounded history and diff inspection through the host
boundary. The host validates runtime context, keeps inspection inside the
runtime artifact/retrieval workspaces, rejects unsafe locator paths, bounds git
history and diff output, and returns unavailable reasons for unsupported
artifact backends or missing local git state instead of widening filesystem
access.

The shared host client, CLI, and Studio now consume the new artifact
history/diff contracts. Added
`references/203-artifact-history-diff-slice.md`. Richer publication retry/target
controls, artifact restore/replay semantics, policy gates, and end-to-end
OpenCode-backed source-publication smoke coverage remain open.

## [2026-04-25] implementation | Added source history publication

Advanced Entangle L3 workstream B5. Applied source-history entries can
now be published as git commit artifacts through the host boundary. The host
verifies the recorded source-history commit and tree, materializes the tree
into a dedicated publication repository, pushes to the runtime's resolved
primary git target when possible, persists publication metadata on both the
source-history record and artifact record, emits `source_history.published`,
and exposes the flow through the shared host client, CLI, and Studio.

The shared git service contract now also supports local `file://` remotes via
`transportKind: "file"` so Entangle can exercise real git pushes against
bare repositories without network access. Policy approval, richer publication
retry/target controls, artifact restore/replay semantics, and end-to-end
OpenCode-backed source-publication smoke coverage remain open.

## [2026-04-25] implementation | Added local source history application

Advanced Entangle L3 workstream B5. Accepted source-change candidates can
now be explicitly applied into runtime-local source history. The host validates
that the current source workspace still matches either the candidate base tree
or head tree, records `already_in_workspace` or `applied_to_workspace`, creates
a commit on `refs/heads/entangle-source-history`, annotates the candidate with
application metadata, writes a durable source-history record, and emits
`source_history.updated`.

The shared host client, CLI, and Studio now expose source-history apply, list,
and inspect surfaces. Added
`references/201-source-history-application-slice.md`. Policy approval, remote
publication, source commit artifact records, artifact history/diff, and
end-to-end OpenCode-backed smoke coverage remain open B5 work.

## [2026-04-25] implementation | Added source change candidate review mutation

Advanced Entangle L3 workstream B5. Source-change candidates now have an
audited host review mutation for `accepted`, `rejected`, and `superseded`
decisions. The host only mutates pending candidates, records structured review
metadata, validates supersession targets, and emits
`source_change_candidate.reviewed` without applying source files, committing,
pushing, or publishing artifacts.

The shared host client parses the mutation response and formats review
evidence, the CLI adds `host runtimes source-candidate <nodeId> <candidateId>
--review <status>`, and Studio exposes review actions in the selected
candidate detail panel. Added
`references/200-source-change-candidate-review-slice.md`. Policy approval,
runner-owned source history, git publication, artifact history/diff, and
end-to-end OpenCode-backed smoke coverage remain open B5 work.

## [2026-04-25] implementation | Added source change candidate file preview

Advanced Entangle L3 workstream B5. Source-change candidates with
shadow-git tree snapshots now expose a bounded read-only file preview route for
paths listed in the candidate changed-file summary. The host reads from the
candidate `headTree`, bounds text to 16 KiB, rejects unsafe or unlisted paths,
and does not expose runtime-local filesystem paths.

The shared host client parses and formats the new preview response, the CLI
adds `host runtimes source-candidate <nodeId> <candidateId> --file <path>`,
and Studio lets the operator choose a changed file from the selected candidate
detail panel. Added
`references/199-source-change-candidate-file-preview-slice.md`. Candidate
mutation, policy approval, source history, git publication, and artifact
linkage remain open B5 work.

## [2026-04-25] implementation | Added source change candidate diff inspection

Advanced Entangle L3 workstream B5. Source-change candidates that carry a
shadow-git tree snapshot can now be inspected through a bounded read-only diff
route on the host. The response returns the candidate plus either a sanitized
`text/x-diff` payload or a bounded unavailable reason, without changing
candidate lifecycle state, committing files, publishing artifacts, or exposing
runtime-local filesystem paths.

The shared host client parses and formats the new diff response, the CLI adds
`host runtimes source-candidate <nodeId> <candidateId> --diff`, and Studio
shows the same bounded diff preview when a candidate is selected. Added
`references/198-source-change-candidate-diff-slice.md`. Candidate mutation,
policy approval, source history/file preview, git publication, and artifact
linkage remain open B5 work.

## [2026-04-25] implementation | Added source change candidate inspection

Advanced Entangle L3 workstream B5. Changed source workspace turns now
create durable pending `SourceChangeCandidateRecord` entries with the harvested
source-change summary and optional shadow-git tree snapshot references. Runner
turns, observed activity, and `runner.turn.updated` events now carry
`sourceChangeCandidateIds`, and runtime inspection exposes the latest candidate
id through the generic `agentRuntime` status.

The host now serves read-only source-change candidate list/detail routes, the
shared host client owns sorting/filtering/formatting helpers, the CLI can list
and inspect candidates, and Studio refreshes and displays candidate detail for
the selected runtime. Added
`references/197-source-change-candidates-slice.md`. Candidate
acceptance/rejection, policy approval, source diff/history APIs, git commit
publication, and artifact linkage remain open B5 work.

## [2026-04-25] implementation | Added source workspace change harvesting

Advanced Entangle L3 workstream B5. Runner turns now record a generic
`sourceChangeSummary` after engine execution, including bounded changed-file
summaries, additions/deletions, optional diff excerpts, truncation state, and
bounded failure evidence. The runner prepares a baseline before the engine turn
and harvests after success or failure, so partial engine writes remain
inspectable.

The implementation uses runner-owned shadow git state at
`runtime/source-snapshot.git` and does not create `.git` inside the node
`source/` workspace. Host observed turn activity, `runner.turn.updated` events,
runtime inspection, shared host-client presentation, CLI output, and Studio
details now expose the same source-change summary. Added
`references/196-source-workspace-change-harvesting-slice.md`. A later slice
added pending source-change candidate records and read-only inspection;
candidate acceptance/rejection, approval/policy flow, artifact history/diff
APIs, and publication remain open B5 work.

## [2026-04-25] implementation | Added node workspace health inspection

Advanced Entangle L3 workstream B4. Runtime inspection now carries a
generic `workspaceHealth` summary for the current Local node workspace layout,
including package, injected context, memory, artifact workspace, runtime state,
retrieval cache, source workspace, engine state, and wiki repository surfaces.

The host computes readiness by logical surface name, blocks desired running
runtimes when required workspace surfaces are degraded, and exposes bounded
evidence through shared host-client detail helpers, CLI summaries, and Studio
selected-runtime details. Added
`references/195-node-workspace-health-slice.md` and aligned older workspace
references with the active L3 layout. The wiki repository root remains reserved
until memory-as-repo migration and rollback semantics are implemented.

The root `pnpm test` gate now runs Turbo test tasks serially with
`--concurrency=1` because the aggregate parallel run could leave the Studio
Vitest process open even though the package-local Studio test command completed
cleanly.

## [2026-04-25] implementation | Added OpenCode permission-block observability

Advanced Entangle L3 workstream B3. Engine turn contracts now include a
generic permission-observation model, an Entangle-facing policy operation
vocabulary, and a `policy_denied` failure classification. The OpenCode runner
adapter now recognizes the one-shot CLI permission auto-rejection line, maps the
OpenCode permission name to a generic operation, and records bounded policy
evidence instead of treating the turn as completed.

Host runtime inspection now exposes the latest permission decision, operation,
and reason through the generic `agentRuntime` status consumed by shared
host-client presentation, CLI, and Studio details. Added
`references/194-opencode-permission-observability-slice.md` to record the
OpenCode source audit and the key limitation: the current one-shot lifecycle
can observe auto-rejected permissions, but cannot yet create resumable Entangle
approval records or feed decisions back into OpenCode.

## [2026-04-25] implementation | Hardened OpenCode adapter lifecycle checks

Advanced Entangle L3 workstream B2. The OpenCode runner adapter now runs
`opencode --version` with the node-scoped environment before each one-shot run,
persists the probed version as a generic `engineVersion`, and exposes the latest
engine version through runner outcomes, host runtime inspection, shared
host-client presentation, CLI, and Studio runtime details.

The adapter also applies bounded process timeouts to the version probe and run
process, sends `SIGTERM` on timeout, and records classified
`provider_unavailable` failure evidence. Added
`references/193-opencode-version-probe-timeout-slice.md` to record the
OpenCode source audit, boundary decisions, remaining L3 gaps, and verification
scope. Permission/approval bridging, external cancellation, source diff
harvesting, artifact publication policy, and OpenCode-backed L3 smoke coverage
remain open.

## [2026-04-25] implementation | Added generic agent runtime inspection status

Advanced Entangle L3 workstream B1/B8. Host runtime inspection now exposes
a generic `agentRuntime` summary derived from effective runtime context and
durable turn records, including mode, engine profile kind/reference/display
name, default agent, state scope, last engine session, last engine turn, stop
reason, and bounded failure evidence.

The shared host-client detail formatter, CLI runtime summaries, and Studio
selected-runtime details now consume that same contract. This is deliberately
engine-agnostic: OpenCode-specific availability probing, permission/approval
bridging, changed-file/artifact harvesting, and full runtime configuration
panels remain open L3 work.

## [2026-04-25] implementation | Isolated OpenCode node runtime state

Advanced Entangle L3 workstream B1/B2. Engine turn outcomes now carry a
generic optional `engineSessionId`, and the OpenCode runner adapter captures
the JSON `sessionID` emitted by `opencode run --format json` so persisted turns
and trace surfaces can link Entangle turns to engine sessions without exposing
OpenCode-specific schema fields.

The adapter now launches OpenCode with node-scoped DB, config, home, and XDG
state/cache/data/config roots under the node engine-state workspace, prepares
those directories before execution, and fails with a classified
`configuration_error` if the workspace or engine-state root is unavailable.
Added `references/191-opencode-runtime-state-isolation-slice.md` to record the
audit findings, boundary decisions, and verification scope. The
permission/approval bridge, timeout/cancellation handling, and full runtime
availability DTOs remain open L3 work.

## [2026-04-25] implementation | Renamed the active Local runtime profile

Started Entangle completion workstream A1/A2. The active runtime profile
machine value is now `local` in schemas, graph defaults, package scaffolds,
examples, smoke scripts, and active tests. Current product documents now use
Entangle language for scope and release status, while historical release
packets remain historical evidence. Added
`references/190-local-runtime-profile-rename-slice.md` to record the slice
scope, decision, constraints, and verification plan.

## [2026-04-25] planning | Made the Entangle plan audit-gated

Updated `references/189-entangle-completion-plan.md` so the plan now
requires a deep initial audit before execution and a mandatory entry, drift,
design, implementation, closure, milestone-exit, and blocker audit loop for
every task from A1 through D5. The update records the current audit baseline:
L2 complete, L3 in progress, L4/L5 incomplete, `hackathon_local` still active
as machine state, OpenCode wired only as the first safe adapter, and the local
reference corpus materialized at the manifest commits.

## [2026-04-25] planning | Added the Entangle completion plan

Added `references/189-entangle-completion-plan.md` as the detailed
completion plan for Entangle from the current post-L2/L3-in-progress
state through L3 Agentic Node Runtime, L4 Local Reliability, and L5 Local GA.
The plan records mandatory professional constraints, task breakdowns,
subtasks, acceptance criteria, and the required execution order.

Also corrected `references/README.md` so the existing L2 slice documents from
181 through 188 are indexed before the new completion plan entry.

## [2026-04-25] implementation | Wired the first OpenCode runner adapter

Added a first safe OpenCode CLI/process adapter for primary node turns. The
runner now resolves the per-node `agentRuntimeContext`, starts OpenCode through
the configured executable, sends a structured Entangle task prompt over stdin,
parses `opencode run --format=json` text/tool/error events, and keeps OpenCode
state under the node-scoped engine-state workspace.

The runner no longer auto-creates the legacy model-endpoint one-turn engine for
primary execution or for default memory synthesis. Remaining L3 work is the
policy/approval bridge, richer OpenCode session lifecycle, artifact/diff
harvesting, git/wiki repository behavior, and CLI/Studio configuration and
observability.

## [2026-04-25] implementation | Added OpenCode-first node agent runtime contracts

Started the L3 Agentic Node Runtime foundation. Deployment catalogs now require
at least one agent engine profile, graph and node bindings can select
`agentRuntime`, effective runtime context exposes the resolved
`agentRuntimeContext`, and the host default is `opencode-default` with
OpenCode as the node coding engine profile.

The old one-turn model adapter is no longer exposed as a node runtime profile.
It remains only as internal implementation code outside the public node runtime
catalog. The host also materializes per-node `source`, `engine-state`, and
`wiki-repository` workspace roots for the coding-agent integration.

## [2026-04-25] release | Closed L2 Federated Workbench

Closed L2 as `v0.2-local-workbench`. The final L2 slice added read-only
runtime memory inspection over existing runner-owned memory files, including
host routes for memory lists and bounded page preview, shared host-client
presentation helpers, CLI commands under `entangle host runtimes memory`, and
a Studio Runtime Memory panel for focused registers, task pages, supporting
wiki pages, and selected-page preview.

The release remains Local-only and does not claim Local GA, Cloud,
Enterprise, reliability tooling, autonomous coding runtime, memory-as-repo, or
artifact history/diff. Those are deferred for roadmap review.

## [2026-04-25] implementation | Added CLI session launch wait polling

Improved the L2 headless session workflow by adding `--wait`,
`--wait-timeout-ms`, and `--wait-interval-ms` to
`entangle host sessions launch`. The command still launches through the host
API, then polls `GET /v1/sessions/{sessionId}` until the session completes,
fails, is cancelled, reaches a recorded session timeout, waits for approval, or
the CLI wait deadline expires.

This is not a relay-publish retry mechanism and does not add a new host-side
session runner. It is an operator CLI wrapper over existing host inspection.

Focused CLI test, typecheck, and lint passed for this slice.

## [2026-04-25] implementation | Added host graph import/export CLI flow

Closed the single-file L2 graph import/export slice by adding
`entangle host graph export <file>` and `entangle host graph import <file>`.
Export writes the active host graph as pretty JSON. Import validates the
candidate through the host before applying it, supports `--dry-run`, and exits
non-zero when host validation reports errors.

This is intentionally not a graph bundle format, revision restore, rollback,
or host-owned graph diff API. The existing direct `host graph apply` command
remains available for lower-level mutation workflows.

Verification passed for focused CLI test, typecheck, lint, and command help
checks.

## [2026-04-25] implementation | Added Studio graph validation

Closed the first L2 Studio graph-validation slice by adding a `Graph
Validation` panel over the existing host `POST /v1/graph/validate` boundary.
Studio submits the currently loaded active graph, renders error and warning
counts, and lists bounded validation findings without applying a new graph
revision.

This is intentionally not graph import/export, imported-candidate validation,
revision restore, rollback, or a host-owned graph diff API.

Verification passed for focused Studio test, typecheck, and lint commands.

## [2026-04-25] implementation | Added bounded artifact preview

Closed the first L2 artifact preview slice by adding a bounded host-owned
preview response for locally materialized text artifacts. The host now exposes
`GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/preview`, reading only files
inside the runtime artifact workspace or retrieval cache and returning an
explicit unavailable reason when preview is unsafe or unsupported.

The shared host client, CLI, and Studio consume the same contract. CLI users
can run `entangle host runtimes artifact <nodeId> <artifactId> --preview`, and
Studio now shows the selected artifact's bounded preview in the runtime
artifact detail panel.

This is intentionally not artifact history, restore, arbitrary filesystem
read, binary preview, object-storage preview, or Cloud/Enterprise artifact
service work.

Verification passed for focused types, host-client, host, CLI, and Studio
test/typecheck/lint commands.

## [2026-04-25] implementation | Added CLI graph template export

Closed the first L2 graph-template workflow by adding
`entangle graph templates list` and
`entangle graph templates export <templateId> <file>`. The command exposes the
canonical `examples/federated-preview/graph.json` graph as the built-in
`federated-preview` template, writes pretty JSON, and preserves root-relative path
behavior when run through `pnpm --filter`.

This is intentionally a CLI template export path over existing graph assets,
not a host-owned template registry, graph bundle import/export format, Studio
template editor, rollback, or restore flow.

Verification passed with focused CLI test, typecheck, lint, template list,
template export, and exported graph inspection commands.

## [2026-04-25] implementation | Added Studio graph revision diff

Closed the next L2 Federated Workbench graph slice by moving the graph diff engine
from the CLI into `packages/host-client`, keeping `entangle graph diff` on that
shared implementation, and adding a Studio `Diff Against Active` card for
selected graph revisions.

The new Studio view compares the selected persisted revision against the
current active graph already loaded from the host. It is intentionally a
client-side revision comparison, not a host-owned diff endpoint, graph import
flow, validation drawer, rollback, or restore path.

Verification passed with focused host-client, CLI, and Studio test,
typecheck, and lint commands. The full post-slice gate also passed with
`pnpm verify`, `pnpm build`, `pnpm ops:check-federated-dev:strict`,
`pnpm ops:smoke-federated-dev:disposable --skip-build --keep-running`, and
`pnpm ops:smoke-federated-dev`.

## [2026-04-25] implementation | Added Studio session launch

Closed the next L2 Federated Workbench parity slice by adding selected-runtime
session launch to Studio. The Runtime Sessions panel now builds a summary and
optional intent draft, calls the shared host-client `launchSession(...)`
method, records the launch response, selects the launched session id, and
refreshes selected-runtime state after the host publishes the launch request.

The host remains the only component that resolves runtime context, default user
node, relay selection, NIP-59 wrapping, and relay publication. Studio does not
publish directly to Nostr or read runner-local context files.

Verification passed with `pnpm --filter @entangle/studio test`,
`pnpm --filter @entangle/studio typecheck`, and
`pnpm --filter @entangle/studio lint`. The full post-slice gate also passed
with `pnpm verify`, `pnpm build`, `pnpm ops:check-federated-dev:strict`,
`pnpm ops:smoke-federated-dev:disposable --skip-build`, and
`pnpm ops:smoke-federated-dev` after clearing an unrelated Docker Desktop restart loop.

## [2026-04-25] implementation | Started L2 Federated Workbench

Added the first L2 Federated Workbench implementation slice. The CLI now has
`entangle package inspect`, `entangle graph diff`, and
`entangle host sessions launch`, with launch now routed through a host API
endpoint instead of a direct CLI relay publish. Package validation now parses
the declared `runtime/tools.json` tool catalog; artifact lists can filter by
session id; and CLI file arguments resolve relative to the original shell
directory when run through `pnpm --filter @entangle/cli dev`.

The slice is documented in `releases/local/l2-local-workbench.md` as active
implementation, not a released L2 packet. Remaining L2 work includes Studio
workbench affordances, graph templates/import/export, artifact preview/history,
memory inspection, and the full Docker-backed release gate before any
`v0.2-local-workbench` tag.

## [2026-04-25] release | Closed L1.5 Local Operator Preview

Closed L1.5 as `v0.1.5-local-operator-preview`. The release adds canonical
Federated Preview assets, `pnpm ops:demo-federated-preview`, reset guidance, CLI
inspection evidence, and a release packet under
`releases/local/l1.5-local-operator-preview.md`.

The preview command was verified from reset Entangle state and proved the Local
host, runner lifecycle, local relay, model-stub execution, Gitea/git-backed
artifact publication, downstream artifact retrieval, Studio HTTP load, and CLI
inspection path. The release remains Local-only and does not claim Local GA,
Cloud, Enterprise, or production readiness.

## [2026-04-25] implementation | Started L1.5 Local Operator Preview

Added canonical Federated Preview assets under `examples/federated-preview/`, including
an inspectable AgentPackage, graph, and model-stub catalog example. Added
`pnpm ops:demo-federated-preview` and `pnpm ops:demo-federated-preview:reset` as the
near-one-command demo and reset paths for the L1.5 release packet.

The preview path reuses the same host, runner, local relay, model-stub, and
Gitea/git-backed artifact flow as the runtime smoke. It remains an Entangle
Local preview path, not Local GA and not a Cloud or Enterprise implementation.

## [2026-04-25] release | Closed R1/L1 Local Operator Baseline

Closed the historical R1 milestone as the canonical L1 Local Operator Baseline
release packet under `releases/local/l1-local-operator-baseline.md`.

The release note records the exact Local claim: a local graph-native operator
runtime with host, runner, local relay, Gitea/git-backed artifact handoff,
Studio, CLI, preflight, active smoke, disposable smoke, and disposable runtime
smoke. It explicitly excludes Local GA, Cloud, Enterprise, production
persistence, production auth, production sandboxing, compliance, backup/restore,
and upgrade guarantees.

The roadmap and release ledger now treat L1 closure as complete and move the
next active Local target to L1.5 Local Operator Preview.

## [2026-04-25] audit | Added Local GA product truth baseline

Added `references/180-local-ga-product-truth-audit.md` as the current
milestone truth table and execution baseline for taking Entangle from
R1/L1 release closure through Local GA.

The audit confirmed that the current repository is functionally ready to close
R1/L1 after final release notes and tag evidence, while R1.1/L1.5, R1.2/L2,
R1.3/L3, and L4/GA still have real product gaps around demo assets, workbench
flows, reliability tooling, and public-claim alignment.

The audit also fixed a shared-contract portability issue where
`packages/types/src/runtime/git-resolution.ts` imported `node:path` and leaked
a Node-only module into the Studio browser bundle. The helper is now portable,
and the Studio build no longer emits that browser externalization warning.

Verification during the audit passed for `pnpm verify`, explicit lint,
typecheck, tests, production build, strict local preflight, active smoke,
standalone disposable smoke, and the disposable runtime smoke covering
host-managed runners, Nostr task intake, provider-backed model-stub execution,
git artifact publication, downstream retrieval, and teardown.

## [2026-04-24] runtime | Added peer-aware runtime edge routes

Effective runtime edge routes now carry host-resolved non-secret Nostr public
keys for adjacent non-user peers. User-node routes remain present without a
synthetic host-generated user pubkey, preserving the current user-identity
boundary.

Runner turn assembly now includes a bounded peer-route summary in engine
requests. This gives nodes real graph route and peer identity context for the
next controlled autonomous handoff slice without allowing the runner or model
to invent destinations.

## [2026-04-24] operations | Proved Docker/Gitea multi-node handoff smoke

`pnpm ops:smoke-federated-dev:disposable:runtime` now bootstraps local Gitea in
installed mode, creates a disposable user and HTTPS token, binds that token as
both the host provisioning credential and runner git principal, starts two
managed runner containers, and proves that the downstream runtime can retrieve
the upstream runtime's published git artifact by `ArtifactRef`.

The full disposable runtime smoke was rerun without `--skip-build`, so the
proof includes the runner image build, host/studio profile startup, provider
model stub, NIP-59 task intake, Gitea-backed publication, downstream retrieval,
and teardown with volumes.

## [2026-04-24] runtime | Proved runner-level multi-node git handoff

Added runner integration coverage for a real two-node artifact handoff. One
`RunnerService` now publishes a git-backed report artifact to a shared remote,
and a downstream `RunnerService` retrieves the published `ArtifactRef` into
its own local engine request while persisting consumed and produced artifact
linkage.

That runner-level proof has now been promoted into the Docker-backed
disposable runtime smoke with local Gitea bootstrap and two host-managed
runners.

## [2026-04-24] operations | Added provider-backed runtime message smoke

`pnpm ops:smoke-federated-dev:runtime` now goes beyond lifecycle probing: after
restart verification it publishes a real NIP-59 `task.request` through the
local relay, runs the managed runner against a credential-checking
OpenAI-compatible model stub, verifies completed host session and runner-turn
state, and verifies git-backed artifact materialization.

The slice also corrected two deployment truths exposed by the stronger smoke:
the Compose host and host-managed runner now share explicitly named state and
secret volumes, and the runner runtime image now includes the git toolchain
needed by the git-backed artifact backend.

## [2026-04-24] operations | Added Docker-backed runtime lifecycle smoke

`pnpm ops:smoke-federated-dev:runtime` now exercises a running federated dev profile by
admitting a disposable package, applying a temporary graph with a local
model-secret binding, starting a real Docker-backed runner, verifying restart
generation recreation plus the durable restart host event, and stopping the
runtime. The disposable profile can run the same check through
`pnpm ops:smoke-federated-dev:disposable:runtime`.

## [2026-04-24] operations | Added disposable federated dev profile smoke

`pnpm ops:smoke-federated-dev:disposable` now runs strict preflight, builds the local
runner image, starts the stable federated dev Compose services, waits for the active
smoke to pass, and tears the profile down with volumes by default. The loop also
repairs host and runner image payload assembly so their production images carry
the built service and workspace-package `dist/` outputs, excludes local
TypeScript incremental metadata from Docker contexts, and treats the fresh
Gitea web surface as the local readiness boundary.

## [2026-04-24] clients | Shared runtime-turn presentation

`packages/host-client` now owns runtime-turn presentation helpers for labels,
status, artifact summaries, and bounded detail lines. Studio reuses the shared
helpers, and the CLI now supports `--summary` output for persisted runtime turn
list and detail commands.

## [2026-04-24] runtime | Added tool execution diagnostics

Normalized tool execution observations now carry optional bounded diagnostic
messages. The diagnostics are written into runner memory, included in
model-guided synthesis context, surfaced through shared runtime-trace detail,
and shown in Studio runner-turn detail.

## [2026-04-24] operations | Added active federated dev profile smoke

The local operator profile now has `pnpm ops:smoke-federated-dev` for validating a
running Compose profile. The smoke checks service presence, runner image
presence, host status/events, Studio HTTP, Gitea HTTP reachability, and the
local `strfry` Nostr WebSocket subscription path.

## [2026-04-24] operations | Added local operator profile preflight

The federated dev Compose profile now has `deploy/README.md` plus
`pnpm ops:check-federated-dev` and `pnpm ops:check-federated-dev:strict`. The preflight checks
profile files, Node/pnpm, Docker, Docker Compose, daemon access, and Compose
config validity before an operator starts the full local topology.

## [2026-04-24] implementation | Added Studio graph revision history

Studio now lists persisted applied graph revisions from the host and can drill
into one revision's host-backed topology snapshot. The active graph view
remains current-state focused, while revision history now has a visual audit
surface without introducing client-owned graph history.

## [2026-04-24] implementation | Added Studio recovery-policy mutation

Studio can now update the selected runtime's recovery policy through the
existing host boundary. The visual surface supports manual recovery and bounded
restart-on-failure policy drafts with local validation matching the host schema,
then refreshes host-owned recovery state after the mutation is accepted.

## [2026-04-24] implementation | Added Studio runtime turn detail

Studio now consumes the host-owned runtime-turn inspection surface. Visual
operators can list persisted turns for the selected runtime, select one turn,
and inspect host-backed detail including phase, trigger, artifact linkage,
engine outcome, tool-execution summary, and memory-synthesis status without
reading runner-Entangle state files.

## [2026-04-24] implementation | Added runtime turn inspection

`entangle-host` now exposes persisted runner turns through
`GET /v1/runtimes/{nodeId}/turns` and
`GET /v1/runtimes/{nodeId}/turns/{turnId}`. The shared host client and CLI can
consume the same boundary, giving operators durable turn list/detail inspection
without reading runner-local files or reconstructing state from event history.

## [2026-04-24] implementation | Hardened package scaffolding and CLI init options

`entangle package init` now exposes package name, package id, default node
kind, and explicit `--force` overwrite controls. The shared package scaffold
utility now rejects accidental file replacement by default and validates the
generated manifest through the canonical package schema before writing.

## [2026-04-24] implementation | Added Studio external-principal lifecycle visibility

Studio now loads host-managed external principals into the graph editor,
renders deterministic principal rows with effective active-graph reference
summaries, disables known-conflicting deletes, and deletes unreferenced
principal bindings through the shared host client.

## [2026-04-24] implementation | Added external-principal deletion

Closed the host-managed external-principal lifecycle gap. `entangle-host` now
exposes `DELETE /v1/external-principals/{principalId}`, rejects deletion while
the active graph still resolves the principal, emits typed
`external_principal.deleted` events, and exposes the operation through the
shared host client and CLI dry-run surface.

## [2026-04-24] implementation | Added OpenAI-compatible agent-engine adapter

Closed the provider-matrix gap where `openai_compatible` was already a
canonical model endpoint adapter kind but `packages/agent-engine` still
rejected it. The engine now supports OpenAI-compatible chat-completions
execution behind the same internal turn contract as Anthropic, including
bearer-token auth, prompt rendering, usage and stop-reason normalization, tool
definition mapping, and bounded tool-call continuation through Entangle's tool
executor.

## [2026-04-24] implementation | Added runner HTTPS-token git transport

Closed the contradiction between the catalog/principal model, which already
allowed HTTPS-token git services, and the runner artifact backend, which still
accepted only SSH-key URL remotes. Runner git publication and retrieval now
build a non-interactive `GIT_ASKPASS` environment for `https_token` principals
from mounted-file or env-var secret delivery without writing token material
into runtime files or remote URLs.

## [2026-04-24] implementation | Added Studio package-source deletion

Closed the visual operator side of the package-source deletion boundary.
Studio now shows active graph references for every admitted package source,
disables deletion when the current graph already proves the source is still in
use, calls the shared host client for unreferenced source deletion, surfaces
mutation failures in the graph editor, and clears local drafts that referenced
the deleted source after host confirmation.

## [2026-04-24] implementation | Added package-source deletion

Added a host-owned package-source deletion boundary through
`DELETE /v1/package-sources/{packageSourceId}`. The host now removes unused
package-source records, rejects deletion while active graph nodes still
reference the source, cleans up host-managed imported archive storage, emits
typed `package_source.deleted` events, and exposes the operation through the
shared host client plus CLI dry-run flow.

## [2026-04-24] implementation | Added local archive package-source admission

Closed the host-side `local_archive` package-source gap. Archive admission now
extracts tar/tar.gz packages inside `entangle-host`, rejects unsafe archive
entries, validates the extracted AgentPackage with the existing package
validator, imports valid packages under host-managed package storage, and
records immutable package-store materialization instead of returning the old
not-implemented validation error.

## [2026-04-24] implementation | Added Studio runtime artifact detail

Extended Studio's runtime artifact panel over the new host item boundary.
Visual operators can now select one runtime artifact, load its host-backed
detail record through `packages/host-client`, and keep artifact-detail failures
isolated from the broader selected-runtime panel.

## [2026-04-24] implementation | Added runtime artifact detail inspection

Added a read-only item boundary for persisted runtime artifacts through
`GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`. The shared host client and
CLI can now inspect one artifact record by id, giving later artifact governance
work a stable resource shape without exposing runner-local artifact files as a
client contract.

## [2026-04-24] implementation | Added bootstrap operator request audit events

Deepened the new host operator-token boundary with a typed security event for
protected mutation requests. When `ENTANGLE_HOST_OPERATOR_TOKEN` is configured,
`entangle-host` now persists `host.operator_request.completed` events for
authorized and unauthorized mutation attempts, carrying non-secret request
metadata, response status, auth mode, and a bootstrap operator id.

## [2026-04-24] implementation | Added bootstrap host operator-token auth

Started the accepted production redesign program with a bounded control-plane
security slice. `entangle-host` can now enforce
`ENTANGLE_HOST_OPERATOR_TOKEN`, host errors include a canonical
`unauthorized` code, and `packages/host-client`, the CLI, and Studio can
propagate the token for local operator profiles that should not expose an open
host mutation surface.

## [2026-04-24] decision | Accepted production redesign program

Accepted `wiki/decisions/production-redesign-program.md` as the active
strategic program for the next major Entangle phase. The decision keeps
Entangle's graph-native, artifact-first control-plane identity while allowing
breaking changes when they improve production clarity, safety, scalability, or
maintainability.

## [2026-04-24] documentation | Imported LatticeOps redesign program

Imported the generated end-to-end repository analysis and unconstrained
redesign proposal into `wiki/redesign/latticeops/`. The imported corpus is
kept as a strategic redesign program separate from the current Entangle
implementation baseline, with `wiki/index.md` now linking the new entry point.

## [2026-04-24] implementation | Added explicit closure references for focused memory

Closed the next runner-memory quality slice by letting the bounded
memory-synthesis path retire active open questions and next actions through
runner-validated references to the current focused-register baseline. Closure
no longer depends only on wording overlap inside `resolutions.md`, while the
runner still owns validation, reconciliation, and all filesystem writes.

## [2026-04-24] implementation | Added focused-register aging signals

Closed the next runner-memory quality slice by adding a separate
runner-owned focused-register carry-state file for
`open-questions.md`, `next-actions.md`, and `resolutions.md`. The bounded
model-guided synthesis prompt now sees carry-forward and stale-review hints for
repeatedly carried active items, while the durable wiki pages remain clean and
human-readable instead of absorbing noisy lifecycle metadata.

## [2026-04-24] implementation | Added engine provider metadata and failure reporting

Closed the next engine-hardening slice by widening the canonical engine outcome
contracts with bounded provider identity and failure payloads, teaching the
Anthropic adapter to preserve provider metadata on successful turns, and making
the runner persist bounded engine failures and already-computed successful
engine outcomes before later artifact-materialization failures can erase that
truth. Studio and CLI now surface the richer detail through the existing shared
runtime-trace presentation path.

## [2026-04-24] implementation | Added shared runtime-trace summaries for Studio and CLI

Closed the next operator-consumption slice by moving runtime-trace presentation
into `packages/host-client` and teaching both Studio and the CLI to consume
that shared model. The selected-runtime trace panel now shows bounded
`engineOutcome` detail, and the CLI can filter to runtime-trace events and
print structured summaries without inventing a parallel event model.

## [2026-04-24] implementation | Added bounded model-guided working-context memory synthesis

Closed the next runner-memory slice by adding a separate bounded
`RunnerMemorySynthesizer` path on top of the deterministic task-page and
recent-work baseline. The runner now maintains
`memory/wiki/summaries/working-context.md` through a strict forced tool call,
but still owns the actual write path and treats synthesis failure as additive
instead of turn-fatal.

## [2026-04-24] implementation | Added deterministic recent-work memory summary

Closed the next bounded runner-memory slice by making post-turn memory
maintenance rebuild `memory/wiki/summaries/recent-work.md` from the freshest
canonical task pages. Future turn assembly now sees the schema rules, wiki
index, wiki log, recent-work summary, and recent task pages together instead
of only the low-level task-page baseline.

## [2026-04-24] implementation | Added bounded builtin memory-ref inspection

Closed the next runtime-deepening slice by widening the runner-owned builtin
tool executor with `inspect_memory_ref`. The internal tool surface can now
inspect only the current turn's resolved `memoryRefs`, with deterministic
exact-path or unique-basename matching, explicit ambiguity failures, and no
arbitrary filesystem widening.

## [2026-04-24] implementation | Added CLI mutation dry-run support

Closed the next bounded CLI completion slice by adding `--dry-run` across the
main host-facing mutation commands. The CLI can now print canonical mutation
payloads or intents for package-source admission, graph apply, node and edge
mutation, external-principal upsert, runtime recovery-policy mutation, and
runtime lifecycle operations without mutating the host.

## [2026-04-24] implementation | Added Studio session drilldown

Closed the next bounded Studio slice by adding selected-session drilldown on
top of the existing host session read surface. The selected runtime view now
keeps the existing runtime-scoped session summary list, but one summary can
also be selected and expanded into host-backed per-node session/runtime detail
through `getSession()`, with bounded stale-selection guards and no widening of
the host API.

## [2026-04-24] implementation | Added CLI runtime artifact inspection parity

Closed the next bounded CLI parity slice by exposing runtime artifact
inspection on top of the existing host artifact read surface. The CLI can now
inspect persisted runtime artifacts and apply deterministic local filters over
artifact backend, kind, lifecycle, publication state, and retrieval state
without widening the host API.

## [2026-04-24] implementation | Added CLI package-source parity

Closed the next bounded CLI parity slice by widening the package-source command
tree to match the existing host contract. The CLI can now inspect one admitted
package source and admit both canonical `local_path` and `local_archive`
sources with optional explicit package-source ids through the same thin
host-client boundary.

## [2026-04-24] implementation | Added Studio live refresh over host events

Closed the next Studio completion slice by using the existing host event
stream to coalesce live refresh of the overview and selected-runtime read
surfaces. Studio now reacts to host-owned topology, runtime, recovery,
session, and artifact events without polling and without reconnecting the
event subscription when the selected runtime changes.

## [2026-04-24] implementation | Added Studio package-source admission

Closed the next bounded Studio mutation slice by exposing host-owned package
admission through canonical `local_path` and `local_archive` requests.
Studio now shows the admitted package-source inventory, keeps package-source
read failures partial instead of collapsing the wider overview, and lets the
operator admit package sources without introducing browser-owned filesystem
semantics into the canonical UI model.

## [2026-04-24] implementation | Added Studio managed-node mutation

Closed the next bounded Studio mutation slice by exposing host-owned managed
node create/replace/delete flows. Studio now selects admitted package sources
for managed nodes, preserves hidden node bindings on replace, and keeps runtime
selection aligned with explicit managed-node selection.

## [2026-04-24] implementation | Added Studio graph edge mutation

Closed the first bounded graph-mutation slice in Studio by exposing host-owned
edge create/replace/delete flows on top of the already implemented edge
resource surface. Studio now supports live edge selection from topology or the
edge list and keeps graph refresh canonical after successful mutation.

## [2026-04-24] implementation | Added Studio runtime session inspection

Closed the next Studio read slice by exposing host-backed session summaries for
the selected runtime, including the selected node's session status, the wider
node-status summary, and trace ids. The selected-runtime refresh path now also
includes session summaries while preserving partial-failure behavior.

## [2026-04-24] implementation | Added Studio runtime artifact inspection

Closed the next Studio inspection slice by exposing persisted runtime artifact
records from the host read model directly in the selected-runtime panel.
Studio now shows deterministic artifact ordering plus lifecycle/publication/
retrieval summaries and locator metadata, and its selected-runtime refresh path
now degrades partially when one sub-read fails instead of collapsing the whole
panel.

## [2026-04-24] implementation | Added Studio runtime lifecycle mutation

Closed the first bounded Studio mutation slice by wiring `start`, `stop`, and
`restart` for the selected runtime strictly through the existing host lifecycle
surfaces. Studio now exposes explicit pending-action and mutation-error state,
but still refreshes real runtime truth from the host instead of inventing a
client-owned runtime state machine.

## [2026-04-24] implementation | Added Studio runtime trace inspection

Closed the next Studio slice by deepening selected-runtime inspection on top of
the now broader host-owned trace surface. Studio now shows reconciliation
state, finding codes, backend/context readiness, restart generation, and a
live runtime-trace panel built from host-derived session, conversation,
approval, artifact, and runner-turn events without widening the host API or
introducing client-owned trace logic.

## [2026-04-24] implementation | Added conversation, approval, and artifact host trace events

Closed the next host-owned trace-widening slice by deriving
`conversation.trace.event`, `approval.trace.event`, and
`artifact.trace.event` from persisted runner state under the same
deduplicated observed-state model already used for session and runner-turn
activity. The slice added observed conversation, approval, and artifact
activity records under observed host state, kept artifact trace events linked
to the best available graph/session/conversation context, and widened host
tests so successive host reads do not duplicate the new trace events.

## [2026-04-24] implementation | Added Studio and CLI runtime-recovery inspection

Closed the first serious client-consumption slice on top of the already
implemented host-owned runtime recovery model. Added reusable recovery-oriented
host-event filtering to `packages/host-client`, widened `entangle-cli` with
typed `host events list` and `host events watch` flows, and taught Studio to
consume the live host event stream for runtime recovery policy, controller,
history, and recovery-event inspection. The audit loop also tightened the
frontend behavior before closing the slice: Studio now keeps a stable host
event subscription instead of reconnecting when the selected runtime changes.

## [2026-04-24] implementation | Added host-owned runtime recovery-history inspection

Closed the next host control-plane diagnostics slice by adding
`GET /v1/runtimes/{nodeId}/recovery` through `entangle-host`,
`packages/host-client`, and the CLI, backed by persisted per-node recovery
records under observed host state. The slice only closed after the audit loop
found and corrected a real deduplication defect: recovery fingerprinting now
canonicalizes recursively sorted JSON instead of relying on raw object key
order, and host reconciliation reads are serialized through a single-flight
guard so rapid successive inspections do not create duplicate recovery
history entries.

## [2026-04-24] implementation | Added richer reconciliation and degraded-state semantics to entangle-host

Closed the next host control-plane slice by making reconciliation explicit and
machine-readable instead of inferring host health from raw runtime failure
counts alone. Runtime inspection now carries derived reconciliation state plus
finding codes, persisted reconciliation snapshots distinguish blocked,
transitioning, and degraded runtimes, `GET /v1/host/status` derives status
from those findings, and host reconciliation-completed events now persist the
same richer aggregate metadata. The slice also kept backward compatibility for
older persisted reconciliation snapshots while adding tests for degraded
runtime context, intentionally stopped runtimes, and contract-level fallback
parsing.

## [2026-04-24] implementation | Added graph-backed edge mutation surfaces through entangle-host

Completed the next host control-plane resource slice by adding `GET /v1/edges`,
`POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
`DELETE /v1/edges/{edgeId}` through `entangle-host`, the shared host client,
and the CLI. The slice keeps the graph as the only source of truth, applies
every edge mutation through validated graph revisions, treats invalid edge
candidates as `400` validation results rather than implicit node creation, and
emits typed `edge.updated` control-plane events.

## [2026-04-24] implementation | Added managed-node mutation surfaces through entangle-host

Completed the first resource-oriented managed-node mutation slice on top of the existing applied-node inspection boundary. `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`, and `DELETE /v1/nodes/{nodeId}` for non-user managed nodes, keeps the graph as the single source of truth by applying validated graph revisions for every mutation, rejects deletion while edges still reference the node, and emits typed `node.binding.updated` events. Closed the slice only after tightening host-client error semantics so only validation-backed `400` responses are parsed as node-mutation DTOs, while `404` and `409` continue to surface as structured host errors.

## [2026-04-23] implementation | Added the first deterministic post-turn memory update phase

Closed the first runner-owned memory-maintenance gap by making completed turns
write task pages into the node wiki, append structured entries to
`memory/wiki/log.md`, keep `memory/wiki/index.md` aligned, and feed recent task
memory back into future turn assembly. This is intentionally deterministic and
auditable, not model-authored wiki mutation.

## [2026-04-23] implementation | Added the first bounded internal tool loop

Closed the first real tool-loop gap by introducing explicit internal tool
execution contracts, loading package-declared tool catalogs into runner turn
assembly, wiring an Entangle-owned builtin tool executor boundary, and
teaching the Anthropic adapter to complete bounded `tool_use` / `tool_result`
loops without leaking provider protocol logic into the runner. The first
builtin surface is intentionally narrow and runtime-local: deterministic
artifact-input inspection. The next best runtime-deepening step is to widen
the builtin tool surface and add the explicit post-turn memory update phase.

## [2026-04-23] implementation | Added an explicit package tool-catalog contract

Closed a real package/runtime contract gap before the internal tool loop by
making `runtime/tools.json` a manifest-owned package file, adding typed package
tool-catalog schemas, updating scaffolds to generate explicit empty catalogs,
and tightening package validation so missing tool catalogs fail admission
deterministically. This keeps the next tool-loop slice grounded in a clean
package boundary instead of ad hoc runner logic.

## [2026-04-23] implementation | Added the first real provider-backed internal agent-engine slice

Closed the live stub-engine gap by extending the effective runtime context with
host-resolved model auth delivery, gating runtime realizability on actual model
credential availability, and implementing the first real Anthropic-backed
internal engine adapter behind the stable `agent-engine` boundary. Live runner
entrypoints now use the real engine path by default, while tests keep explicit
engine injection for determinism. Tightened the model-endpoint contract in the
same slice so auth mode is explicit and the host-owned Anthropic default uses
header-secret semantics instead of an unsafe bearer-token default. The next
best capability move is to deepen the engine into bounded multi-turn and
tool-loop execution rather than revisiting the provider boundary again.

## [2026-04-23] implementation | Widened git handoff retrieval to locator-specific repository targets

Extended the git-collaboration model beyond exact primary-repository retrieval.
The runtime can now resolve locator-specific repository targets from the
effective runtime context, select transport principals deterministically per
git service, retrieve sibling repositories on the primary service, and persist
repository-partitioned retrieval state instead of assuming one retrieval cache
per artifact id. Updated the shared type layer, validator semantics, runner
artifact backend, and integration tests, and re-baselined the implementation
audit so the next main capability target can move to the real internal engine.

## [2026-04-23] implementation | Added host-owned Gitea primary-target provisioning

Closed the first concrete `gitea_api` provisioning path for git collaboration.
The host now provisions primary repository targets itself, persists typed
provisioning-state records, and keeps runtimes unavailable when service-backed
repository provisioning fails.

## [2026-04-23] implementation | Added primary-target git retrieval and handoff validation

Extended the runner from remote publication into the first downstream
retrieval path. The runner now validates inbound published git artifact refs
against the receiving runtime context, retrieves primary-target artifacts into
an explicit retrieval cache, persists typed retrieval-state records, records
consumed artifact ids on the turn record, and passes local artifact inputs into
the engine turn request. Added shared contract coverage for retrieval metadata
and runner tests for both successful retrieval and explicit failure on invalid
handoff.

## [2026-04-23] implementation | Added first remote git publication for preexisting repositories

Extended the runner git artifact backend from local-only materialization into a
first real remote publication path. The runner now configures a deterministic
remote from the resolved git service target, pushes turn artifacts to
preexisting repositories, and persists explicit publication success or failure
metadata without corrupting local artifact truth. Added runner coverage for
both successful publication to a controlled bare repository and graceful
failure when the configured remote is unavailable, then reran `pnpm verify`.

## [2026-04-22] quality | Switched package-local tests to shared source-resolved Vitest config

Hardened the local developer workflow so package-level Vitest runs no longer
depend on whichever sibling `dist/` outputs happen to be on disk. Added a
shared root Vitest config with explicit workspace-source aliases and pointed
package-local test scripts at that config, so direct `pnpm --filter ... test`
runs exercise current contracts from source.

## [2026-04-22] implementation | Added host-managed external principal bindings and resolved git principals

Closed the gap between the identity model and the runtime model by introducing
machine-readable external principal records for git-facing identities, binding
them from graph nodes by reference, persisting them through `entangle-host`,
resolving them into effective runtime context, and exposing them through the
shared host/host-client/CLI surfaces. Added validator coverage for missing and
ambiguous principal resolution so future remote git publication can build on a
real credential-binding boundary instead of ad hoc host logic.

## [2026-04-22] refinement | Removed runtime-local filesystem paths from portable artifact refs

Refined the first git artifact slice so protocol-facing `ArtifactRef` locators
no longer embed runtime-local filesystem paths such as `repoPath`. Moved local
materialization details into `ArtifactRecord.materialization`, updated runner,
host, host-client, and contract tests, and documented the corrected boundary
as a dedicated artifact portability refinement.

## [2026-04-22] implementation | Added git-backed runner artifacts and host runtime artifact inspection

Extended the runner from pure lifecycle persistence into the first durable
artifact slice. Added structured artifact contracts and artifact records,
linked produced artifact ids into session, conversation, and turn state,
materialized markdown turn reports in a runner-local git repository with real
commits, propagated produced artifact refs into outbound `task.result`
messages, and exposed persisted runtime artifacts through a new host read
surface plus matching host-client coverage. Revalidated the batch with runner,
host, host-client, and contract tests plus a full `pnpm verify`.

## [2026-04-22] implementation | Hardened the local Docker image topology for host, runner, and Studio

Refined the local image profile so it no longer depends on implicit toolchain
acquisition or broad runtime payloads. Added an explicit `.dockerignore`,
moved host and runner build stages to pinned `pnpm` installation with an
explicit store path, switched Studio to a static Nginx runtime image, added
workspace package `files` allowlists, excluded compiled test files from
deployable runtime `dist/` outputs, kept typed lint coverage over tests with a
tightly scoped out-of-project configuration, and revalidated the batch with
`pnpm verify`, real `build -> deploy` payload checks, and rebuilt Docker
images for runner, host, and Studio.

## [2026-04-22] implementation | Added live Nostr runner transport and validated it against a real local relay

Extended `entangle-runner` from deterministic transport-only intake into a
real Nostr-backed transport slice. Added canonical NIP-59 / Entangle rumor
transport constants, implemented a real `NostrRunnerTransport`, tightened
runner startup so readable relay connections are established before the service
reports itself as started, and verified the batch with a live local relay smoke
that produced session, conversation, and turn records under the runtime root.

## [2026-04-22] fix | Corrected the local strfry Compose profile to mount a real relay config

Found that the federated dev Compose relay service was not actually usable because it
started `strfry` without a config file. Added an explicit
`deploy/federated-dev/config/strfry.federated-dev.conf`, mounted it into the Compose service, and
revalidated local relay reachability through `nostr-tools` before rerunning the
end-to-end runner smoke.

## [2026-04-22] implementation | Add machine-readable A2A and runner state contracts

Added canonical `@entangle/types` ownership for Entangle A2A payloads and
runner-local session, conversation, approval, and turn-state contracts.
Added validator surfaces for A2A documents and lifecycle transition checks, and
aligned the protocol and runner references with the new machine-readable
ownership.

## [2026-04-22] implementation | Materialize stable host-owned runtime identities

Moved per-node Nostr identity ownership into the host, added non-secret
`identityContext` to the effective runtime context, introduced a separate local
secret storage profile, and made the runner reject identity drift instead of
silently generating ephemeral authorship.

## [2026-04-22] bootstrap | Initialized project wiki

Created the first project wiki structure, schema, index, and initial concept, decision, source, and session pages.

## [2026-04-22] ingest | Imported Entangle design corpus into references and wiki

Structured the current state of the project into a detailed references corpus and a wiki intended for long-term project memory and design management.

## [2026-04-22] ingest | Recorded reference repository manifest

Documented the primary upstream repositories that should be mirrored into `resources/` once GitHub becomes reachable from the execution environment.

## [2026-04-22] ingest | Materialized external reference repositories

Cloned the tracked reference repositories into `resources/` and recorded their exact commit SHAs in the resources manifest.

## [2026-04-22] decision | Removed Claude Code leak mirror from local resources

Removed the public Claude Code leak mirror from `resources/` and updated the project corpus to avoid carrying a toxic reference with low practical value relative to its risk.

## [2026-04-22] decision | Kept qmd as optional wiki and memory tooling

Retained `qmd` in `resources/`, but explicitly downgraded its role to optional tooling for search, wiki navigation, and future memory workflows rather than a core Entangle runtime dependency.

## [2026-04-22] ingest | Added Nostr and relay implementation references

Added `nostr-tools`, `strfry`, and `khatru` to `resources/` to cover the protocol library layer and the relay implementation / relay-framework design space.

## [2026-04-22] decision | Chose an initial implementation stack direction

Recorded a stack recommendation centered on TypeScript, `nostr-tools`, `strfry`, `Gitea`, Docker Compose, and a Studio-plus-runner split.

## [2026-04-22] decision | Established a mandatory repository audit loop

Corrected stale status statements after the reference corpus was materialized locally and formalized a standing rule: every substantial Entangle interaction should start with a repository audit pass and update the corpus when durable state changes.

## [2026-04-22] ingest | Recorded recommended Codex CLI workflow

Added a project-specific Codex CLI usage page describing which commands are worth using for Entangle, which ones are secondary, and the recommended interactive, review, continuation, and automation loops.

## [2026-04-22] decision | Dropped the idea of a Codex init step

Verified that the current Codex CLI in this environment has no `codex init` subcommand. Entangle bootstrap should therefore be handled as normal repository scaffolding plus Codex-assisted implementation, not as a Codex-specific initialization phase.

## [2026-04-22] decision | Distinguished shell commands from interactive slash commands

Recorded that Codex shell subcommands and interactive slash commands are different interfaces. Clarified that interactive `/init` can still make sense conceptually even though `codex init` is not a shell subcommand in this environment.

## [2026-04-22] decision | Added root AGENTS instructions for Entangle

Added a repository-level `AGENTS.md` file so future Codex sessions have immediate project-specific instructions at the root instead of relying only on the wiki schema under `wiki/AGENTS.md`.

## [2026-04-22] decision | Kept cloned resources out of root git history

Corrected the repository baseline so the cloned upstream repositories under `resources/` remain local research material rather than accidental embedded repositories in the main Entangle git history. Also fixed the refresh loop to iterate only over actual git directories.

## [2026-04-22] milestone | Prepared the first committed project baseline

Closed the initial bootstrap phase with a clean repository baseline ready for the first commit: canonical documents aligned, root `AGENTS.md` added, local resource policy corrected, and git staging behavior verified before publishing the initial history to GitHub.

## [2026-04-22] ingest | Added A2A and MCP as secondary protocol references

Cloned the Google-led A2A protocol repository and the official Model Context Protocol repository into `resources/` as secondary references. Recorded their role as comparison and boundary-layer references rather than as replacements for Entangle's internal Nostr-native protocol model.

## [2026-04-22] decision | Renamed local Nostr spec mirror from nips-official to nips

Simplified the local reference name from `nips-official` to `nips` and updated the corpus so the local path naming is shorter and cleaner while preserving the same upstream reference.

## [2026-04-22] decision | Added a high-rigor Codex workflow for deep specification work

Recorded a project-specific workflow for using Codex during deep specification, architecture decision-making, and implementation planning so the project can optimize for durable system quality rather than fast but weak early choices.

## [2026-04-22] specification | Added normative contract rules for Entangle core types

Extended the design corpus beyond descriptive architecture by adding a normative layer for core contract invariants, normalization and validation rules, and runtime state machines. This makes the corpus substantially more implementation-ready for a serious team build rather than only conceptually coherent.

## [2026-04-22] specification | Expanded the corpus into packaging, edge policy, artifact, control-plane, and compatibility specs

Added a deeper operational specification layer covering the on-disk AgentPackage standard and binding model, the semantic matrix for edge behavior, the artifact backend contract with git as the first serious backend, the control plane and graph mutation rules, and the versioning/migration policy needed for durable long-term evolution.

## [2026-04-22] specification | Added observability, Studio, hackathon-profile, and phase-gate specs

Extended the corpus again to cover trace and observability requirements, the responsibilities of Entangle Studio as a truthful graph-aware client, the exact hackathon runtime profile as a restricted subset of the full architecture, and the quality gates that define when the project is actually ready to move from specification into architecture and implementation decisions.

## [2026-04-22] specification | Clarified that the hackathon graph should be visibly non-flat

Adjusted the hackathon-facing documents so the demo is no longer framed as a simple entrypoint-plus-workers tree. The preferred hackathon graph should now show a more expressive organizational structure, such as multiple supervisory branches, peer collaborators, and at least one deeper delegation chain.

## [2026-04-22] decision | Split Studio from local runtime orchestration through a host control-plane service

Clarified that Studio should be the operator-facing graph and runtime administration surface, but should not directly own Docker or process lifecycle logic. Added a concrete `entangle-host` architectural role to own applied local graph state, package admission, runtime materialization, and local runner lifecycle while preserving Studio as the most convenient user-facing control surface.

## [2026-04-22] decision | Made headless operation a first-class architectural requirement

Clarified that Entangle should remain operable without the visual frontend. Studio is the preferred graph-aware surface, but CLI and automation should use the same host control-plane boundary rather than introducing separate privileged paths or making the frontend the only serious way to operate the system.

## [2026-04-22] decision | Chose a monorepo-first topology with thin CLI and package scaffolding

Clarified that Entangle should remain a single monorepo through the hackathon and early product phase, with explicit internal package boundaries rather than multiple repositories. Also recorded that Studio is a core hackathon deliverable, while CLI and package scaffolding are worthwhile if they remain thin surfaces over shared host, validator, and scaffold packages rather than turning into separate parallel products.

## [2026-04-22] decision | Separated Nostr identity from git credentials and signing surfaces

Clarified that a node's Nostr keypair is the authoritative Entangle protocol identity, but should not be reused directly as the git transport credential. Recorded a stronger identity model where external git principals, transport secrets, commit attribution, and optional commit-signing material are related but distinct surfaces.

## [2026-04-22] decision | Made relay, git service, and model endpoint resources deployment-scoped and bindable

Clarified that Entangle must not hardcode one relay, one git server, or one model endpoint as product truth. Recorded a stronger model where the host owns a deployment-scoped resource catalog, graphs may define defaults, nodes may bind different resource profiles, and the hackathon uses the restricted case of one shared relay profile, one shared git service profile, and one shared model profile.

## [2026-04-22] specification | Added host API, reconciliation, and effective runtime context contracts

Extended the corpus from architectural roles into explicit implementation-facing contracts for the host control plane and the runner boundary. Specified a first serious host API shape, desired-versus-observed state reconciliation, and the effective binding/runtime context model that resolves graph, resource, and secret inputs before a runner starts.

## [2026-04-22] specification | Added engine-adapter and local deployment topology contracts

Extended the corpus again to clarify the provider-facing side of the runner and the local deployment profile. Recorded an internal engine-adapter boundary for model execution, a recommended first operational `anthropic` adapter for the hackathon, and a Compose-based local topology where stable services are booted statically while runner containers are created dynamically by the host.

## [2026-04-22] decision | Made coherent commits part of the standard repository loop

Clarified that audit and documentation updates are not enough on their own. After each substantial interaction that leaves durable repository changes, the batch should be committed once the repository is internally consistent, so the working baseline is not left suspended in an uncommitted state.

## [2026-04-22] audit | Ran the first full pre-implementation repository audit

Performed a systematic read of the canonical corpus, wiki, root project documents, and selected upstream references. Corrected drift where earlier documents still described the hackathon as a flat orchestrator tree, where runner input language had not caught up with effective bindings, where the host API was still described as only loosely defined, and where the wiki overview still pointed to already-completed architecture work as the next step.

## [2026-04-22] decision | Froze local package admission, Docker-backed host access, and the canonical monorepo toolchain

Clarified that Studio-driven package admission must resolve into host-owned `local_path` or `local_archive` package sources instead of browser-local filesystem handles; clarified that the local Docker profile should give `entangle-host` explicit access to the Docker Engine for dynamic runner management; and tightened the stack recommendation from a Bun-friendly posture into a canonical TypeScript + Node 22 + pnpm + Turborepo toolchain.

## [2026-04-22] decision | Froze the internal agent-engine boundary, host-state layout, and hackathon CLI profile

Closed the last pre-implementation questions by deciding that Entangle should own a first-party internal `agent-engine` package rather than embed an upstream runtime wholesale, by freezing `.entangle/` as the default local host-state root with explicit desired/observed/trace/import/workspace partitions, and by fixing the hackathon CLI to a thin but real profile centered on offline validation, package scaffolding, and minimal online host operations.

## [2026-04-22] audit | Corrected final pre-scaffold drift in executive summary, ignore policy, and phase wording

Ran a follow-up coherence pass on the post-audit refinement batch. Corrected the remaining stale executive-summary description of the hackathon graph, aligned the ignore policy with the now-canonical `.entangle/` runtime root and upcoming pnpm/turbo tooling, and tightened the wiki overview so it reflects that implementation-readiness has passed while the repository remains under the standard audit loop.

## [2026-04-22] decision | Froze schema ownership and downgraded the remaining open questions to non-blocking tradeoffs

Clarified that `packages/types` must own the primary `zod` schemas and host API DTO contracts, with validators, host routes, CLI, and Studio consuming those contracts rather than redefining them. Also updated the open-questions document so it no longer presents already-resolved implementation decisions as active blockers, and instead tracks only residual future-facing tradeoffs.

## [2026-04-22] implementation | Scaffolded the first real monorepo baseline and verified the toolchain

Created the first implementation-grade monorepo layout under `apps/`, `services/`, `packages/`, and `deploy/`. Added the initial workspace/tooling files, the first machine-readable schemas in `packages/types`, a bootstrap validator layer, a host client, a package scaffold utility, a Fastify-based host bootstrap, a runner stub, a thin CLI, a first Studio scaffold, and the first Compose/Docker deployment profile. Verified that `pnpm install`, `pnpm typecheck`, and `pnpm build` pass on the scaffolded workspace after normalizing TypeScript workspace resolution and cleaning build artifacts.

## [2026-04-22] implementation | Turned the host scaffold into a real local control-plane baseline

Extended the implementation from a status-only bootstrap into a first serious local control-plane slice. Added shared host DTOs for catalog, package-source, and graph operations; strengthened validator semantics with package-source resolution, graph-default checks, and realizable edge transport checks; implemented persistent host state under `.entangle/host`; added catalog, package-source, and graph routes to `entangle-host`; taught the CLI to operate those routes; and removed the fake demo graph from Studio so it now renders live host state. Re-verified the workspace with `pnpm build`, and manually exercised the host-plus-CLI flow for catalog inspection, package admission, graph validation, graph apply, and graph retrieval.

## [2026-04-22] implementation | Added the first enforced quality baseline

Raised the repository quality bar from manual discipline alone to an explicit engineering baseline. Added real ESLint-based linting, first Vitest suites for validator, host-client, package-scaffold, and host API behavior, a GitHub Actions CI workflow, and a root `pnpm verify` aggregate gate. Hardened host error semantics so invalid client input and missing resources are returned as structured 4xx responses instead of generic 500s, and documented the stricter audit-plus-quality policy in the canonical corpus.

## [2026-04-22] implementation | Added runtime materialization and runtime host surfaces

Extended `entangle-host` from graph persistence into runtime preparation. The host now resolves effective bindings, writes runtime intents and observed runtime records, materializes per-node workspaces, injects `effective-runtime-context.json`, and exposes the first runtime inspection and lifecycle routes through the same host boundary used by CLI and tests.

## [2026-04-22] implementation | Replaced the runner bootstrap stub with injected-context bootstrap logic

Extended `entangle-runner` so it now loads injected runtime context from disk, reads package prompt files and runtime config, constructs a normalized agent-engine turn request, and executes a first stub-engine turn from real materialized node state rather than from a hardcoded inline request.

## [2026-04-22] implementation | Added runtime-backend abstraction and persisted reconciliation state

Extended `entangle-host` from runtime materialization into a first real runtime-backend and reconciliation slice. Added an explicit runtime-backend boundary, introduced a tested in-memory backend and a first Docker backend, switched package materialization from workspace symlink assumptions to runtime package snapshots, persisted reconciliation snapshots under observed host state, and exposed richer runtime/status fields through the host surface.

## [2026-04-22] quality | Tightened build-first contract checking for workspace type safety

Clarified and enforced that workspace-wide typechecking must not silently depend on stale generated contract outputs. The local quality baseline now treats fresh contract builds as part of the type-safety gate so downstream packages do not drift behind newly changed shared schemas.

## [2026-04-23] quality | Fixed typed lint workspace-source resolution for tests

Extended the quality baseline so package-local typed linting over test files no longer resolves sibling workspace packages through stale published-style `dist/` declarations. Added a root `tsconfig.eslint.json` with explicit workspace-source path mappings and pointed the ESLint project-service default project at that config, so strict linting now evaluates tests against current source contracts just like the shared Vitest path already did.

## [2026-04-22] verification | Smoke-validated the Docker runtime backend against a real runner container

Built the local `entangle-runner:federated-dev` image, admitted a package, applied a graph under the Docker backend profile, and confirmed that `entangle-host` created and observed a real runner container as `running`. Cleaned up the temporary runtime afterward.

## [2026-04-22] implementation | Replaced Docker CLI shell-outs with a first-party Docker Engine API client

Refined the Docker runtime backend so `entangle-host` no longer shells out to the `docker` binary for image inspection and container lifecycle. Added a first-party Docker Engine API client with unix-socket coverage tests, injected that boundary into the runtime backend for better testability, and removed the host container's dependency on the Docker CLI package while keeping the Docker socket as the explicit local operator control path.

## [2026-04-22] implementation | Replaced the blunt build-first typecheck gate with an explicit TypeScript project graph

Refined the workspace toolchain so type safety is now driven by an explicit TypeScript project-reference graph instead of a generic `pnpm build` pre-step before workspace-wide typechecking. Added a root solution `tsconfig`, declared references across the composite packages and Node services, aligned composite package scripts around `tsc -b`, and kept Studio as a separate bundler-driven typecheck surface.

## [2026-04-22] implementation | Replaced per-node package copies with an immutable host-managed package store

Refined package materialization so admitted package contents are now hashed and materialized into an immutable host-managed package store under `.entangle/host/imports/packages/store/`. Package-source records now carry that materialization metadata, manifests and runtime package roots resolve from the store, and each node workspace exposes a host-managed package surface backed by the immutable store instead of a private copied snapshot.

## [2026-04-22] implementation | Added deterministic runner transport and the first long-lived local intake loop

Extended `entangle-runner` beyond bootstrap-only execution. Added a deterministic transport abstraction, a file-backed runner-Entangle state store, and a long-lived `RunnerService` that subscribes by recipient pubkey, validates inbound A2A payloads, advances session and conversation state through the canonical lifecycle, builds engine turn requests from inbound context, and emits bounded `task.result` replies when required. Tightened the runner tests around wrong-recipient rejection, no-response flows, idempotent startup, and persisted turn/state records.

## [2026-04-23] audit | Reconciled the planning corpus with the implemented runtime slices

Ran a repository-wide implementation-state audit after the host, runner,
transport, artifact, and external-principal slices. Added
`references/59-implementation-state-and-delivery-audit.md` as the new current
implementation-truth document, marked
`references/40-pre-implementation-audit.md` as historical, rewrote
`references/15-implementation-strategy.md` around the current rolling delivery
order, and updated `README.md`, `references/README.md`, and `wiki/overview.md`
so the repository is no longer described as pre-implementation or
control-plane-only.

## [2026-04-23] implementation | Added runtime secret delivery and resolved git principal bindings

Introduced a real `secret://` contract, resolved secret-binding metadata in the
runtime type system, host-side resolution of git secret refs under
`ENTANGLE_SECRETS_HOME/refs/...`, and runtime artifact context that now carries
git principal bindings with explicit availability and mounted-file delivery
metadata. Extended the Docker runtime backend to mount the secret volume into
runner containers as read-only, and updated local git artifact commits so they
use bound git-principal attribution when a primary principal is available.

## [2026-04-23] implementation | Added deterministic git remote selection and provisioning policy contracts

Extended git service profiles with explicit transport-facing `remoteBase`
configuration and repository-provisioning mode, then taught the host to resolve
a deterministic `primaryGitRepositoryTarget` into effective runtime context
when service and namespace selection are unambiguous. Updated the local
deployment profile with `ENTANGLE_DEFAULT_GIT_REMOTE_BASE`, hardened the shared
type layer and host tests around the new contract, and locked the current
policy to a graph-shared repository target derived from `graphId`.

## [2026-04-23] implementation | Added explicit artifact publication-state metadata

Extended `ArtifactRecord` with a machine-readable `publication` object so the
repository can distinguish local materialization from remote publication
outcomes without overloading `ref.status`. The current local git-backed
artifact path now persists `publication.state: "not_requested"`, and the shared
type and runner tests lock the rules for `not_requested`, `published`, and
`failed` publication metadata.

## [2026-04-23] implementation | Added the first canonical host event surface

Promoted host-side control-plane tracing into a real typed event boundary.
Added canonical host-event contracts in `packages/types`, persisted and
normalized host event records in `services/host`, exposed `GET /v1/events` for
HTTP inspection plus WebSocket live streaming on the same route, and extended
`packages/host-client` with typed event listing and subscription helpers.
Closed the slice only after fixing the replay/live WebSocket race, tightening
strict TypeScript and ESLint compliance around the shared client surface, and
verifying the batch with targeted tests plus `pnpm verify`.

## [2026-04-23] implementation | Added typed graph-revision history inspection through the host boundary

Promoted persisted graph revisions from a host-internal file detail into a real
control-plane surface. Added canonical graph-revision DTOs in
`packages/types`, switched new revision persistence to typed revision records,
kept backward-compatible reads for older raw graph-snapshot revision files, and
exposed `GET /v1/graph/revisions` plus `GET /v1/graph/revisions/{revisionId}`
through `entangle-host`, `packages/host-client`, and the CLI. Closed the slice
only after tightening strict test parsing under ESLint, normalizing the last
stale active-revision read path in host state, and re-running `pnpm verify`.

## [2026-04-23] implementation | Added the first applied-node inspection surface

Promoted applied non-user node bindings from a host-internal reconciliation
detail into a real resource surface. Added canonical node-inspection DTOs in
`packages/types`, exposed `GET /v1/nodes` plus `GET /v1/nodes/{nodeId}` through
`entangle-host`, and wired the same boundary through `packages/host-client` and
the CLI. Closed the slice only after fixing strict fixture quality in the new
types test, tightening the host integration assertions for ESLint, and
re-running `pnpm verify`.

## [2026-04-24] implementation | Added deterministic runtime restart through the host boundary

Promoted runtime restart from a planned lifecycle action into a real
control-plane surface. Added monotonic `restartGeneration` to runtime intents
and runtime inspection, introduced the typed `runtime.restart.requested` host
event, implemented `POST /v1/runtimes/{nodeId}/restart` through
`entangle-host`, `packages/host-client`, and the CLI, and taught the Docker
runtime backend to recreate managed containers when the restart generation
changes even if the runtime context path is unchanged. Closed the slice only
after adding contract, host-client, host integration, and Docker backend tests
and re-running `pnpm verify`.

## [2026-04-24] implementation | Added host-owned session inspection surfaces

Promoted persisted runner session records from host-internal runtime files into
a real read-only control-plane surface. Added canonical session DTOs in
`packages/types`, exposed `GET /v1/sessions` plus
`GET /v1/sessions/{sessionId}` through `entangle-host`, wired the same
boundary through `packages/host-client` and the CLI, and hardened host-side
aggregation so inconsistent cross-node graph ids for the same session fail as
an invariant violation instead of being silently merged. Closed the slice only
after targeted `types`, `host-client`, and `host` tests, a full `pnpm verify`,
and `git diff --check`.

## [2026-04-24] implementation | Added host-derived session and runner activity events

Widened the host event surface beyond control-plane and runtime lifecycle
events by deriving `session.updated` and `runner.turn.updated` records from
persisted runner session and turn files. Added canonical observation records in
`packages/types`, taught `services/host` to persist observed activity
fingerprints under observed host state, emit events only on durable change, and
clean up stale activity records when runtimes or activity disappear. Closed the
slice only after targeted `types` and `host` tests, a full `pnpm verify`, and
`git diff --check`.

## [2026-04-24] implementation | Added explicit host-owned runtime recovery policy

Extended the runtime recovery surface from read-only history into a real
control-plane model. Added desired recovery-policy records, observed
recovery-controller state, `PUT /v1/runtimes/{nodeId}/recovery-policy`,
typed recovery-policy and recovery-attempt/exhaustion host events, and bounded
automatic `restart_on_failure` behavior with attempt accounting anchored in a
stable failure fingerprint instead of restart-generation churn. Closed the
slice only after widening shared contracts, adding deterministic host tests via
an injectable runtime backend, and re-running targeted package tests plus the
full `pnpm verify` gate.

## [2026-04-24] implementation | Added runtime recovery host events

Widened the typed host event surface so the already implemented runtime
recovery model is observable through durable events instead of only through
polling runtime recovery inspection. Added
`runtime.recovery.recorded` plus `runtime.recovery_controller.updated` to the
shared host-event contracts, emitted them from host-owned recovery history and
controller state transitions, and hardened controller-change detection so
trivial idle bootstrap state does not create event noise. Closed the slice
only after widening `types`, `host-client`, and `host` tests and re-running
`pnpm verify`.

## [2026-04-24] implementation | Added bounded engine-turn observability

Closed the gap where the internal Anthropic tool loop produced real execution
behavior but lost most of its diagnostic truth after the turn completed.
Widened the shared engine contracts with bounded tool-execution observations,
provider stop-reason metadata, and a reusable engine-outcome structure; taught
the internal engine path to accumulate tool requests plus bounded tool
execution outcomes across the whole tool loop; persisted normalized engine
outcome into runner turn records; and propagated the same canonical outcome
through observed runner activity plus durable `runner.turn.updated` host
events. Closed the slice only after targeted `types`, `agent-engine`,
`runner`, and `host` tests, plus a final full `pnpm verify`.

## [2026-04-24] implementation | Added bounded builtin session-state inspection

Closed a real asymmetry in the runner tool surface. Builtin tool ids are now a
frozen shared contract instead of arbitrary strings accepted by package tool
catalogs, and the runner now supports `inspect_session_state` for bounded
inspection of the current session's local session, conversation, turn, and
related artifact state. The tool is intentionally narrow: it cannot widen to
other sessions, it only accepts bounded numeric limits, and it reads
runner-owned persisted state through shared state-store helpers instead of ad
hoc filesystem traversal. Closed the slice only after widening `types` and
runner tests, re-running targeted lint/test loops, and then confirming the full
`pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added session-aware working-context synthesis

Deepened model-guided memory synthesis without widening the builtin tool
catalog. Extracted a shared bounded runner-local session snapshot builder,
rewired `inspect_session_state` to delegate to it, and then fed the same
bounded current-session snapshot into the `working-context.md` synthesis prompt.
This keeps session reasoning grounded in one canonical runner-local summary
instead of duplicating or omitting it across tool execution and memory
synthesis. Closed the slice only after widening runner tests, re-running
targeted runner lint/test loops, and then confirming the full `pnpm verify`
plus `git diff --check` gates.

## [2026-04-24] implementation | Added artifact-aware working-context synthesis

Deepened the same model-guided memory synthesis path again, this time by
passing explicit retrieved and produced artifact context into the
working-context synthesis request. Kept the boundary clean by avoiding any
filesystem rediscovery pass inside the synthesizer: the runner now hands over
canonical `artifactRefs` plus bounded `artifactInputs` it already owns from the
completed turn. Closed the slice only after adding direct runner-memory tests,
a service-level handoff test, re-running targeted runner gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added artifact-context carry-forward in working-context synthesis

Deepened the same bounded memory path once more by making the durable
`working-context.md` page preserve artifact context explicitly. The strict
`write_memory_summary` tool now requires bounded `artifactInsights`, while the
runner-owned page shape now carries deterministic consumed/produced artifact
lists plus those synthesized durable artifact observations.

Closed the slice only after widening runner-memory assertions over the final
page content, re-running targeted runner lint/test/typecheck gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added engine-outcome-aware working-context synthesis

Deepened the same bounded memory path again by making the synthesis prompt
carry a dedicated summary of the just-completed turn's normalized engine
outcome. The model-guided working-context pass can now see bounded tool
executions, provider stop reason, failure metadata, and token usage for the
current turn instead of relying on assistant text and coarse stop reason alone.

Closed the slice only after widening runner-memory prompt assertions,
re-running targeted runner lint/test/typecheck gates, and then confirming the
full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added execution-insight carry-forward in working-context synthesis

Deepened the same bounded memory path once more by making the durable
`working-context.md` page preserve execution signals explicitly. The strict
`write_memory_summary` contract now requires bounded `executionInsights`, and
the runner-owned page shape now gives those signals a first-class `Execution
Signals` section.

Closed the slice only after widening runner-memory assertions over the final
page content, re-running targeted runner lint/test/typecheck gates, and then
confirming the full `pnpm verify` plus `git diff --check` gates.

## [2026-04-24] implementation | Added execution-aware deterministic memory baseline

Strengthened the runner-owned deterministic memory layer by preserving richer
normalized execution detail in canonical task pages and in the derived
`recent-work.md` page rebuilt from those task pages. This keeps the source of
truth relationship clean while giving later model-guided memory passes a
stronger deterministic base.

Closed the slice only after widening runner-memory assertions over both task
pages and recent-work output, re-running targeted runner lint/test/typecheck
gates, and then confirming the full `pnpm verify` plus `git diff --check`
gates.

## [2026-04-24] implementation | Added final-state session-context memory synthesis

Corrected the model-guided working-context path so optional memory synthesis now
runs against the runner's final post-turn conversation/session state instead of
the earlier pre-completion snapshot. The durable `working-context.md` page now
also carries bounded session-context lines plus synthesized session insights.

Closed the slice only after widening runner-memory assertions over durable
session-context output, proving via service tests that synthesis now sees the
final `closed` / `completed` lifecycle state, and then re-running targeted
runner gates plus the full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added memory-synthesis observability

Made optional memory synthesis observable through the canonical turn/trace path
by persisting a bounded synthesis outcome on `RunnerTurnRecord` and surfacing
that same outcome through host-owned runner activity plus CLI/Studio runtime
trace helpers. This removes the old blind spot where synthesis success or
failure only lived in wiki files and log entries.

Closed the slice only after widening contract, runner, host, host-client, and
Studio trace assertions, then re-running targeted package tests plus the full
`pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused memory summary registers

Deepened the bounded model-guided memory layer so one synthesis pass now
updates `working-context.md`, `stable-facts.md`, and `open-questions.md`
instead of concentrating all durable synthesized state in one omnibus summary.
Future turns now consume those focused summary pages directly through canonical
`memoryRefs`, and successful memory-synthesis outcomes now preserve the full
updated-page set for runtime trace and operator inspection.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added decision register to model-guided memory

Closed the remaining gap between the runner lifecycle spec and the bounded
memory layer by adding `memory/wiki/summaries/decisions.md` to the same
strict model-guided synthesis pass that already maintained working-context,
stable-facts, and open-questions summaries. The durable working-context page
now also carries bounded decision signals, and future turns now consume the
focused decision register directly through canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added next-actions register to model-guided memory

Closed the next structural gap in the bounded memory layer by adding
`memory/wiki/summaries/next-actions.md` to the same strict model-guided
synthesis pass that already maintained working-context, decisions,
stable-facts, and open-questions summaries. Open questions now remain focused
on unresolved uncertainty, while future turns can consume durable pending work
directly through the dedicated next-actions register in canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added resolutions register to model-guided memory

Closed the next lifecycle gap in the bounded memory layer by adding
`memory/wiki/summaries/resolutions.md` to the same strict model-guided
synthesis pass that already maintained working-context, decisions,
stable-facts, open-questions, and next-actions summaries. Recent closures no
longer disappear implicitly when open questions are rewritten or pending work
is completed; future turns can now consume durable resolved questions and
completed actions directly through the dedicated resolutions register in
canonical `memoryRefs`.

Closed the slice only after widening runner, host, host-client, Studio, and
shared-contract assertions, then re-running targeted package tests plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused-register lifecycle discipline

Strengthened the bounded memory layer so model-guided synthesis now sees the
current open-questions, next-actions, and resolutions baseline explicitly
instead of relying only on implicit carry-forward through raw summary pages.
Also added runner-owned exact closure reconciliation: when the same normalized
item appears in `resolutions.md`, it is removed from active open-question and
next-action registers instead of surviving as silent duplication.

Closed the slice only after widening runner tests to prove prompt-time
register continuity and exact closure reconciliation, then re-running targeted
runner quality gates plus the full `pnpm verify` and `git diff --check`
gates.

## [2026-04-24] implementation | Added stale-item disappearance discipline

Strengthened long-horizon focused-memory quality by forbidding stale review
candidates from disappearing silently. Once an open question or next action is
already marked stale in the runner-owned baseline, the bounded synthesis pass
must now either keep that exact item active, retire it explicitly through
closure references, or carry the same exact text into `resolutions.md`.

Closed the slice only after widening runner tests to prove stale baseline
items are rejected when they disappear without explicit retention or
retirement, then re-running targeted runner quality gates plus the full
`pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added explicit stale-item replacement

Closed the next lifecycle gap in the bounded memory layer by letting stale
review candidates retire through explicit replacement instead of only through
continued carry-forward or closure. The runner now validates exact `from -> to`
replacement mappings for stale open questions and next actions, so a stale
baseline item can be replaced by narrower active successors without being
dropped silently or mislabeled as resolved.

Closed the slice only after widening runner tests to prove valid replacement
flows succeed and invalid replacement refs fail deterministically, then
re-running targeted runner quality gates plus the full `pnpm verify` and
`git diff --check` gates.

## [2026-04-24] implementation | Added explicit stale-item consolidation

Closed the next long-horizon lifecycle gap in the bounded memory layer by
letting multiple overlapping stale review candidates collapse into one
narrower successor item. The runner now validates exact many-to-one
consolidation mappings for stale open questions and next actions, so stale
active overlap can be reduced deterministically without silent loss and
without pretending the overlap is already resolved.

Closed the slice only after widening runner tests to prove valid
consolidation flows succeed and invalid consolidation refs fail
deterministically, then re-running targeted runner quality gates plus the
full `pnpm verify` and `git diff --check` gates.

## [2026-04-24] implementation | Added focused-register transition history

Closed the next runner-memory quality slice by deriving bounded
focused-register transition-history entries from validated lifecycle changes.
The runner now preserves runtime-local audit records for closure, completion,
replacement, consolidation, and exact resolution-overlap retirement decisions
without adding lifecycle bookkeeping noise to the durable wiki pages.

## [2026-04-24] implementation | Hardened host verification without socket binds

Closed a verification portability gap in the host test suite by replacing
socket-bound harness mechanics with in-process request, fetch, and WebSocket
injection paths. Docker Engine client coverage now mocks `node:http.request`
while still asserting socket-path and API request shape, fake Gitea API
coverage now uses Fastify injection behind a typed fetch stub, and the host
event-stream test now avoids an in-process listener race by subscribing before
the event-producing mutation.

Closed the slice only after rerunning host lint, typecheck, and tests; the
focused-register targeted gates already in the worktree; full repository
`pnpm verify`; and `git diff --check`.

## [2026-04-25] implementation | Added autonomous runner handoff emission

Closed the next multi-node runtime slice by adding structured engine
`handoffDirectives` and runner-owned validation for autonomous `task.handoff`
emission. Handoffs now require local autonomy permission, exactly one resolved
effective edge route, a materialized peer pubkey, and an allowed relation
before the runner publishes a message. The runner records emitted handoff
message ids on turn state, host activity/event surfaces preserve them, and the
host client exposes the count and detail in runtime-turn presentation.

Also corrected A2A follow-up validation so every response-required message
must allow at least one follow-up, and taught the runner to treat inbound
`task.result` and `conversation.close` as coordination state updates instead
of accidental fresh engine turns.

Closed the slice after widening types, runner, host, and host-client coverage,
then rerunning targeted lint, typecheck, and test gates for the touched
packages.

## [2026-04-25] implementation | Reconciled active conversations for delegated sessions

Closed the first follow-on lifecycle gap after autonomous handoff emission by
making the runner derive session `activeConversationIds` from currently open
conversation records instead of preserving append-only conversation history.
Sessions with multiple outbound handoffs now remain active while any delegated
conversation is still working, and complete with an empty active-conversation
set once the final delegated result or close message arrives.

Also widened the session-state snapshot used by runtime-local inspection so it
distinguishes active conversation count from total observed conversation
history.

Closed the implementation pass after widening runner service and builtin
inspection tests, then rerunning targeted runner tests and typecheck.

## [2026-04-25] implementation | Added active-work details to session events

Closed the next host-surface diagnostics slice by widening host-derived
`session.updated` events and observed session activity records with
`activeConversationIds`, `rootArtifactIds`, and `lastMessageType`. Runtime
trace consumers can now distinguish currently open work from historical
session status without re-reading runner-Entangle state directly.

The shared host-client runtime-trace presentation now renders active
conversation count, root artifact count, and the last message type for session
events, and Studio consumes the same detail lines.

Closed the pass after widening contract, host, host-client, and Studio tests,
then rerunning targeted checks for those packages.

## [2026-04-25] implementation | Added active-work fields to session summaries

Closed the matching session-inspection read-model gap by widening
`HostSessionSummary` with aggregate `activeConversationIds`,
`waitingApprovalIds`, `rootArtifactIds`, and optional `latestMessageType`
derived from the node-owned `SessionRecord` entries contributing to each
host session summary.

The host now computes deterministic unique aggregate ids across participating
node records, the shared host client parses the widened contract, and Studio
session summaries render the aggregate active-work counts before operators
open per-node session detail.

## [2026-04-25] implementation | Added shared session presentation and CLI summaries

Closed the headless follow-through for the widened session summary surface by
moving session presentation helpers into `packages/host-client`. Studio now
uses the shared helper boundary through a thin re-export instead of owning
session formatting locally.

The CLI now supports compact operator-oriented output for
`host sessions list --summary` and `host sessions get <sessionId> --summary`,
including active conversation, approval, root artifact, node status, trace,
and latest message signals over the existing host session read model.

## [2026-04-25] implementation | Added shared artifact presentation and CLI summaries

Closed the parallel artifact-presentation drift by moving artifact label,
status, locator, filtering, sorting, and detail-line helpers into
`packages/host-client`. Studio now consumes those helpers through a thin
re-export while preserving the same selected-artifact detail behavior.

The CLI now supports compact operator-oriented output for
`host runtimes artifact <nodeId> <artifactId> --summary` and
`host runtimes artifacts <nodeId> --summary`, over the existing host-backed
runtime artifact read model.

## [2026-04-25] implementation | Added shared recovery presentation and CLI summaries

Closed the parallel runtime-recovery presentation drift by moving recovery
policy descriptions, recovery-controller descriptions, event labels, event
filtering, and recovery-history record detail helpers into
`packages/host-client`. Studio now consumes those helpers while keeping
editable recovery-policy draft logic local to the UI.

The CLI now supports compact operator-oriented output for
`host runtimes recovery <nodeId> --summary` over the existing host-backed
runtime recovery inspection surface. The ESLint project-service default-file
cap was raised deliberately so type-aware lint continues to cover the growing
CLI and host-client helper test suites instead of forcing lower-value test
consolidation.

## [2026-04-25] implementation | Added shared graph presentation and CLI summaries

Closed the graph-topology presentation drift by moving graph revision,
managed-node, node-inspection sorting, and edge presentation helpers into
`packages/host-client`. Studio now consumes those helpers through thin local
re-export boundaries instead of owning separate graph vocabulary.

The CLI now supports compact operator-oriented `--summary` output for active
graph inspection, graph revision list/detail, applied node list/detail, and
applied edge list commands over the existing host-owned graph resource
surfaces.

## [2026-04-25] implementation | Added shared resource inventory presentation

Closed the package-source and external-principal inventory presentation drift
by moving sorting, labels, details, active graph reference collection, and
reference summaries into `packages/host-client`. Studio now consumes those
helpers through thin local boundaries while keeping package-source admission
draft construction local to the UI.

The CLI now supports compact operator-oriented `--summary` output for
package-source and external-principal list/detail commands. Summary mode reads
the active graph only when requested so headless operators see the same active
reference and deletion-safety signals as Studio without changing raw host
responses.

## [2026-04-25] implementation | Added shared runtime inspection presentation

Closed the top-level runtime inventory summary gap by adding shared
runtime-inspection presentation helpers to `packages/host-client`. The helpers
cover deterministic runtime sorting, desired/observed state, reconciliation
state and finding codes, context readiness, restart generation, backend,
package source, runtime handle, status/reason text, and primary git
provisioning details.

The CLI now supports compact operator-oriented `--summary` output for
`host runtimes list` and `host runtimes get <nodeId>` over the existing
host-owned `RuntimeInspectionResponse` contract.

## [2026-04-25] implementation | Added shared host status presentation

Closed the top-level host health summary gap by adding shared host-status
presentation helpers to `packages/host-client`. The helpers cover host labels,
reconciliation summary strings, runtime counts, finding codes, graph revision,
backend, and last reconciliation time.

The CLI now supports compact operator-oriented `host status --summary` output
over the existing host-owned `HostStatusResponse` contract while keeping raw
`host status` output unchanged.

## [2026-04-25] implementation | Added session conversation lifecycle diagnostics

Narrowed the delegated-session diagnostics gap by extending the host session
read model with conversation lifecycle status counts derived from
runner-owned conversation records. `GET /v1/sessions` now carries aggregate
counts across participating runtime records, and `GET /v1/sessions/{sessionId}`
now carries the same diagnostic per node without moving conversation
ownership into the host.

Shared `packages/host-client` presentation helpers, Studio's selected-runtime
session panel, and CLI `host sessions ... --summary` output now expose recorded
conversation counts and lifecycle-state summaries alongside active
conversation ids, approvals, root artifacts, traces, and latest message type.

## [2026-04-25] implementation | Added session consistency findings

Extended the host session read model from raw delegated-conversation counts
into actionable consistency diagnostics. The host now compares each
runner-owned `SessionRecord.activeConversationIds` set with the node-owned
conversation records for the same session and surfaces bounded findings for
active ids without records, terminal conversations still marked active, and
open conversation records missing from active ids.

The findings remain read-only diagnostics: runner records still own session
and conversation truth, while host summaries, per-node session inspection,
shared presentation helpers, Studio, and CLI summary output can now show drift
that should be repaired by runtime reconciliation rather than hidden behind
aggregate counts.

## [2026-04-25] implementation | Added session diagnostics to host status

Connected session consistency diagnostics to the top-level host health surface.
`GET /v1/host/status` now includes inspected-session count, total session
consistency finding count, and affected-session count. Any nonzero session
consistency finding count degrades the host status even when runtime
reconciliation itself is aligned, so operators do not have to inspect
`/v1/sessions` first to discover delegated-session drift.

Shared host-status presentation helpers and CLI summary projection now expose
the session diagnostics line alongside runtime counts, reconciliation summary,
backend, graph revision, finding codes, and last reconciliation time.

## [2026-04-25] implementation | Surfaced session diagnostics in Studio host status

Closed the visual follow-through for top-level session diagnostics by wiring
Studio's Host Status panel to the shared `host-client` session-diagnostics
formatter. Visual operators now see inspected-session count, consistency
finding count, and affected-session count at the same top-level point where
the degraded host status appears, matching the CLI summary vocabulary.

## [2026-04-25] implementation | Refreshed Studio overview from session diagnostics events

Closed the refresh-path gap created by top-level session diagnostics. Studio
now treats `session.updated` and `conversation.trace.event` records as
overview-refresh triggers because those node-scoped events can change the
host-wide inspected-session and consistency-finding counts shown in Host
Status.

## [2026-04-25] implementation | Added bounded session diagnostics to trace events

Closed the explanation gap between top-level host degradation and runtime
trace detail by widening `session.updated` events with conversation lifecycle
counts plus bounded session-consistency finding count and finding-code
summaries. Host observation fingerprints now include those diagnostics, so a
session trace event can change when drift appears or clears even if the raw
session record did not otherwise change.

## [2026-04-25] documentation | Added session diagnostics observability reference

Closed a documentation drift gap by adding a canonical reference slice for the
session diagnostics observability chain from session read models through host
status, Studio refresh, and `session.updated` runtime-trace diagnostics.

Also corrected the stale `references/README.md` link for the runtime recovery
event-surface slice.

## [2026-04-25] implementation | Added runner session active-work repair

Moved delegated-session work from passive diagnostics toward bounded
runner-owned repair. Runner startup now lists durable session and conversation
records, realigns each session's `activeConversationIds` from open
conversation records before subscribing to transport intake, and keeps
terminal sessions from being reactivated by stale open-work references.

The repair is deliberately scoped to the derived active-work set: it does not
synthesize session lifecycle transitions or mutate state from host diagnostics.

## [2026-04-25] implementation | Added session-level consistency diagnostics

Extended delegated-session diagnostics beyond conversation-id-specific drift.
`HostSessionConsistencyFinding` now allows session-level findings without a
`conversationId`, and the host reports
`active_session_without_open_conversations` when a runner-owned session remains
`active` with no active ids and no open conversation records.

The finding contributes to session inspection, top-level host degradation, and
shared CLI/Studio presentation without inventing a synthetic conversation id or
mutating runner-owned session lifecycle state.

## [2026-04-25] implementation | Completed drained sessions during runner startup repair

Extended runner-owned startup repair from active-id reconciliation into bounded
lifecycle repair. When a runner starts and finds an `active` session with no
derived active conversations, no waiting approvals, and known last-message
context, it now completes the session through the canonical
`active -> synthesizing -> completed` transition path before subscribing to
transport intake.

The host diagnostic remains read-only; the lifecycle mutation stays inside the
runner and does not invent message, approval, artifact, or history records.

## [2026-04-25] implementation | Preserved approval gates during session repair

Closed the approval-gated session lifecycle gap in the runner. Live
conversation-drain handling and startup repair now both move drained `active`
sessions with pending `waitingApprovalIds` to `waiting_approval` instead of
allowing them to complete.

The change keeps approval ids as unresolved work gates, preserves the message
context used for the transition, and keeps lifecycle mutation inside the
runner-owned state boundary.

## [2026-04-25] implementation | Added approval status counts to session inspection

Extended the host-owned session read model with `approvalStatusCounts` derived
from runner-local `ApprovalRecord` files. `GET /v1/sessions` and
`GET /v1/sessions/{sessionId}` now expose approval lifecycle counts alongside
active-work ids, conversation status counts, waiting approval ids, root
artifacts, and consistency findings.

Shared host-client helpers, CLI summary projection, and Studio session
inspection now use the same recorded-approval count and approval-status
summary vocabulary without moving approval mutation authority into the host.

## [2026-04-25] implementation | Added approval status counts to session events

Aligned runtime trace events with the widened session read model.
`session.updated` now carries `approvalStatusCounts`, and host observation
fingerprints include those counts so approval lifecycle changes can refresh the
session trace event even when the session record itself is otherwise stable.

Shared runtime-trace presentation now renders recorded approval count and
approval lifecycle summaries, with Studio consuming the same helper output.

## [2026-04-25] implementation | Added runtime approval inspection

Closed the drilldown gap behind session approval counters. `entangle-host` now
exposes `GET /v1/runtimes/{nodeId}/approvals` and
`GET /v1/runtimes/{nodeId}/approvals/{approvalId}` over validated
runner-local `ApprovalRecord` files, keeping the surface read-only and leaving
approval decision authority inside the runner boundary.

Shared host-client helpers now own approval sorting, filtering, labels, status
text, and bounded detail lines. The CLI can list, filter, summarize, and
inspect runtime approvals, and Studio now exposes a selected-runtime approval
panel with host-backed item detail.

## [2026-04-25] implementation | Added session approval consistency diagnostics

Closed the read-model integrity gap between `waitingApprovalIds` and
runner-local approval records. Host session inspection now emits bounded
approval-level consistency findings for missing waiting approval records,
terminal approvals that still gate a session, pending approvals that are not
referenced by the session, and `waiting_approval` sessions without any pending
approval gate.

The findings flow through `GET /v1/sessions`, `GET /v1/sessions/{sessionId}`,
top-level session diagnostics in `GET /v1/host/status`, and `session.updated`
finding-code summaries. Shared session presentation now distinguishes
conversation, approval, and session finding targets without moving approval
mutation authority into the host.

## [2026-04-25] implementation | Repaired approved approval gates in runner sessions

Moved approval-gated session repair from counting every waiting approval id as
unresolved to clearing only those gates backed by `approved` approval records.
Live final-conversation handling and startup repair now remove approved waiting
ids, keep missing, pending, rejected, expired, and withdrawn records as
unresolved gates, and can complete drained active or `waiting_approval`
sessions once all waiting gates are approved.

The change keeps approval mutation authority inside the runner boundary:
`entangle-host` still observes approval records and diagnoses drift, while the
runner performs the lifecycle transition through canonical
`waiting_approval -> active -> synthesizing -> completed` paths only when
durable message context exists.

## [2026-04-25] implementation | Added approval context to session snapshots

Closed the runtime-context gap between approval lifecycle state and the bounded
session snapshot used by runner turns. `inspect_session_state` now returns
bounded approval summaries, recorded approval count, and waiting-gate count for
the current session, with a bounded `maxApprovals` input alongside the existing
turn and artifact limits.

Model-guided memory synthesis now consumes the same approval-aware snapshot and
renders compact approval status context in its deterministic session lines. The
change keeps approval mutation authority inside runner lifecycle paths while
making approval evidence visible to runtime inspection and durable memory
synthesis.

## [2026-04-25] implementation | Carried approval gates into working context

Made approval blockers deterministic in runner-owned memory. The
model-guided memory synthesis path now writes an explicit approval-gates
subsection inside `working-context.md`, including waiting approval ids and
bounded approval-record summaries with status, requester, approver count, and
conversation id when present.

This keeps exact approval-gate state visible to future turns even when
model-written session insights are compressed or focused elsewhere, while
leaving approval mutation authority in runner lifecycle paths and full approval
record inspection on the existing host read surface.

## [2026-04-25] implementation | Handled approval request and response messages

Added explicit A2A metadata contracts for `approval.request` and
`approval.response`, then wired the runner to materialize approval lifecycle
state from those coordination messages. Inbound approval requests now create or
refresh pending runner-local approval records, add waiting approval ids, move
conversations to `awaiting_approval`, and move sessions to `waiting_approval`
when allowed.

Inbound approved approval responses now update the matching approval record,
attribute the responding approver, close the approval conversation when policy
allows, and reuse the existing no-open-work completion path so unblocked
waiting sessions can complete. Unknown approval ids remain non-fatal and do
not synthesize approval truth; malformed approval metadata is now rejected at
the canonical A2A validator boundary.

Rejected approval responses now also have explicit coverage: the runner marks
the approval rejected, closes the approval conversation when policy allows,
clears active waiting gates, and moves the blocked session to `failed` when the
session lifecycle allows it.

## [2026-04-25] planning | Added definitive production delivery roadmap

Added `references/174-definitive-production-delivery-roadmap.md` as the
release-oriented plan for taking Entangle from the current local operator
baseline to the complete production product. The roadmap defines the R0 through
R6 release sequence, the mandatory audit and reconsideration loop, quality
gates, a 48-hour presentable milestone plan, and explicit non-goals before R1
and R3.

The plan keeps the immediate target honest: close and present Entangle v0.1 as
a local operator baseline, then begin production-foundation work around
PostgreSQL, workspace-aware identity, authorization, audit, and API hardening.

## [2026-04-25] implementation | Validated approval message metadata

Closed the approval-message contract gap in the canonical A2A validator.
`validateA2AMessageDocument(...)` now rejects malformed `approval.request` and
`approval.response` metadata through message-type-specific findings before the
runner can write session, conversation, or approval state.

This keeps approval mutation authority inside the runner while moving malformed
approval lifecycle intent out of the "coordination no-op" path and into the
protocol validation boundary.

## [2026-04-25] implementation | Guarded orphan approval responses

Tightened the runner coordination path for valid but locally orphaned
`approval.response` messages. The runner now checks for a matching local
approval record, session record, or conversation record before writing
lifecycle state; when none exist, it absorbs the response as a handled no-op
instead of creating a phantom active session and opened conversation.

This keeps unknown approval ids as a runner-local lifecycle concern while
preventing stale or irrelevant approval responses from manufacturing active
work.

## [2026-04-25] implementation | Validated approval response policies

Closed the approval-message loop-control gap in the canonical A2A validator.
`approval.request` messages must now require a response, while
`approval.response` messages must be terminal with `responseRequired: false`
and `maxFollowups: 0`.

This keeps approval coordination from turning into a protocol ping-pong while
leaving approval mutation authority inside the runner lifecycle boundary.

## [2026-04-25] planning | Added R1 local operator release ledger

Added `references/177-r1-local-operator-release-ledger.md` as the active
release-truth companion to the definitive production roadmap. The ledger
tracks current R1 evidence, remaining release-note and smoke obligations,
explicit non-goals, verification commands, and the exit decision for tagging
`v0.1-local-operator-baseline`.

This keeps the immediate milestone honest: Entangle can close as a presentable
local operator baseline only when README, wiki overview, roadmap, release
ledger, verification, and smoke evidence agree without overclaiming production
readiness.

## [2026-04-25] planning | Reframed roadmap around three final products

Rewrote `references/174-definitive-production-delivery-roadmap.md` around the
three final products: Entangle, Entangle Cloud, and
Entangle Enterprise. The roadmap now requires sequential product
development: finish Local first, then begin Cloud, then package the
stable production core as Entangle Enterprise.

The Local product line now has its own incremental release train from L1 local
operator baseline through L1.5 local operator preview, L2 federated workbench, L3
local reliability, and L4 Local GA. The R1 ledger now points to L1.5 as
the next release instead of production foundation, preventing later-product
infrastructure from displacing completion of the first final product.

## [2026-04-25] planning | Audited product-line roadmap readiness

Added `references/178-product-line-roadmap-readiness-audit.md` after a critical
roadmap, documentation, and code readiness audit. The audit corrected product
name drift across README, wiki overview, wiki log, the definitive roadmap, and
the R1 ledger so the final products are Entangle, Entangle Cloud, and
Entangle Enterprise.

The roadmap now records that `LatticeOps` is only the imported redesign corpus
name, that the historical R1 ledger controls the L1 Local Operator Baseline
milestone, and that execution should now proceed through L1 release closure
before any L1.5, Cloud, or Enterprise work begins.

`git diff --check` and `pnpm verify` passed after the audit changes.
`pnpm ops:check-federated-dev:strict` also passed when run with Docker socket access;
the sandboxed attempt failed only because the Docker daemon socket was not
available inside the sandbox.

## [2026-04-25] organization | Partitioned local deployment and release packets

Moved the active local deployment profile under `deploy/federated-dev/`, added
`deploy/README.md` as the deployment-profile index, and introduced
`scripts/federated-dev-profile-paths.mjs` so local preflight and smoke scripts consume
one shared Compose/config/Dockerfile path definition.

Added `releases/` as a release-control area distinct from the canonical
`references/` corpus, with `releases/local/l1-local-operator-baseline.md` as
the active Local L1 packet pointing back to the R1/L1 ledger. The monorepo
itself remains intact; `apps/`, `services/`, and `packages/` were not moved,
and no active Cloud or Enterprise deployment profile was introduced.

Verified the reorganization with script syntax checks, Compose config
validation against `deploy/federated-dev/compose/docker-compose.federated-dev.yml`, strict
local preflight with Docker socket access, and `pnpm verify`.

## [2026-04-25] implementation | Exposed node agent-runtime configuration

Added `references/209-agent-runtime-node-configuration-slice.md` and closed the
graph-backed part of B8 runtime configuration. The CLI now exposes
`entangle host nodes agent-runtime` to set or clear node-level runtime mode,
agent engine profile, and default-agent overrides while preserving unrelated
managed-node bindings through the existing host replacement boundary.

Studio's Managed Node Editor now loads catalog engine profiles and writes the
same `agentRuntime` fields for managed nodes. The remaining B8 work is richer
runtime evidence and engine-event panels, not the basic graph/node
configuration surface.

## [2026-04-25] implementation | Added runner-owned wiki repository snapshots

Added `references/210-wiki-repository-sync-slice.md` and advanced B4 of the
Entangle completion plan. Completed runner turns now mirror the node's
active `memory/wiki` tree into the materialized `wiki-repository` workspace,
initialize a local git repository when needed, commit changed snapshots on the
`entangle-wiki` branch, and persist a bounded sync outcome on the turn record.

The same sync outcome now propagates through host observed activity,
`runner.turn.updated` events, shared runtime-turn presentation, CLI output, and
Studio turn inspection. This is intentionally a local runner-owned snapshot
path, not yet a full memory-as-repo migration, backup/restore feature, or
remote publication workflow.

## [2026-04-25] implementation | Added doctor checks for runtime wiki repositories

Added `references/211-local-doctor-wiki-repository-health-slice.md` and
extended `entangle deployment doctor` so live diagnostics inspect each available
runtime context's `wiki-repository` workspace. The doctor now warns when a
runtime wiki repository is not configured, not initialized, dirty, missing a
HEAD commit, unavailable through runtime context, or failing git inspection.

The check remains read-only and diagnostic. It does not initialize, commit,
repair, publish, or delete node memory repositories.

## [2026-04-26] implementation | Added bounded engine-request summaries

Added `references/212-engine-request-summary-slice.md` and advanced B6 of the
Entangle completion plan. Executable runner turns now persist bounded
`engineRequestSummary` evidence for the assembled engine request shape:
prompt part counts, aggregate prompt character counts, memory, artifact, and
tool counts, execution limits, peer-route inclusion, and generation time.

The summary propagates through runner turn records, host observed activity,
`runner.turn.updated` events, shared runtime-turn presentation helpers, CLI
turn output, and Studio turn inspection. It deliberately avoids storing raw
prompt text, memory paths, artifact contents, secret-bearing runtime context,
or engine-specific request payloads.

## [2026-04-26] implementation | Added policy and workspace prompt context

Added `references/213-engine-prompt-policy-workspace-context-slice.md` and
continued B6 of the Entangle completion plan. Executable runner turns
now include explicit prompt context for agent-runtime mode/profile, logical
workspace ownership boundaries, autonomy policy, source-mutation approval
policy, and inbound response/constraint controls.

`engineRequestSummary` now records whether agent-runtime, workspace-boundary,
policy, and inbound-control context were included, with backward-compatible
defaults for summaries written by the previous slice. Shared runtime-turn
presentation now exposes those inclusion signals to CLI and Studio turn
inspection.

## [2026-04-26] implementation | Bridged OpenCode action directives

Added `references/214-opencode-action-directive-bridge-slice.md` and advanced
B7 of the Entangle completion plan. Executable turn assembly now includes
an Entangle action contract telling node-local coding engines to propose
side effects through fenced `entangle-actions` JSON blocks rather than
messaging peers or publishing artifacts directly.

The OpenCode adapter now extracts bounded `entangle-actions` blocks from
assistant text, validates `handoffDirectives` with the canonical engine schema,
strips the machine-action block from human assistant messages, and returns
validated directives through the existing runner-owned handoff path. Malformed
action blocks now produce a bounded `bad_request` engine result.

## [2026-04-26] implementation | Hardened rejected handoff evidence

Tightened the runner-owned action validation path for B7/B3. Syntactically
valid handoff directives that are not authorized by local autonomy policy or
cannot resolve through an effective peer route now fail as `policy_denied`
instead of generic `bad_request`.

When this rejection happens after an engine result has already been returned,
the failed runner turn now preserves bounded engine session id, engine version,
provider stop reason, permission observations, tool observations, and usage
evidence so host, CLI, and Studio inspection retain useful debugging context
without granting the rejected side effect.

## [2026-04-26] implementation | Added safe runtime artifact restore

Added `references/215-runtime-artifact-restore-slice.md` and advanced B5 of
the Entangle completion plan. Supported git-backed runtime artifacts can
now be restored through the host, CLI, and Studio into
`artifactWorkspaceRoot/restores/{restoreId}` with durable restore-attempt
records under runtime state.

The restore path is conservative: unsupported backends, unsafe paths, missing
local git state, and existing targets without overwrite produce structured
`unavailable` records. Successful restores stream git blob contents through a
temporary directory and atomically publish the restore target, so failed
restores do not leave a partially published workspace.

## [2026-04-26] implementation | Added Studio artifact restore controls

Added `references/216-studio-artifact-restore-slice.md` and completed the
first visual restore control for git-backed runtime artifacts. Studio now uses
the shared host client to request safe artifact restores from the selected
artifact detail panel and displays the latest restore id, status, restored
path, or unavailable reason returned by the host.

The Studio action stays non-destructive: it does not request overwrite, so
existing restore targets remain protected by the host restore policy.

## [2026-04-26] implementation | Added runtime artifact restore history

Added `references/217-runtime-artifact-restore-history-slice.md` and closed the
first audit-read surface for runtime artifact restore attempts. The host now
exposes node-wide and artifact-scoped restore history, the shared host client
and CLI can inspect those records, and Studio loads recent restore attempts for
the selected artifact.

Restore records are now persisted as append-only audit entries for repeated
attempts with the same requested restore id, so unavailable retries and later
successful restores remain inspectable instead of overwriting one another.

During verification, `@entangle/validator` consistently stalled under the
default Vitest worker pool while passing immediately with the fork pool. Its
package test script now pins `--pool=forks` so the repository-level
`pnpm verify` gate remains deterministic. This pool choice was later
superseded on 2026-04-29 after `--pool=forks` became the root-gate hang point
for the validator suite.

## [2026-04-26] implementation | Added non-primary publication provisioning

Added `references/218-non-primary-publication-provisioning-slice.md` and
advanced B5 of the Entangle completion plan. Source-history publication
now runs host-owned Gitea provisioning for the resolved publication target, so
selected non-primary `gitea_api` repositories are created before the remote git
push path is attempted.

Provisioning records for source-history publication targets are persisted under
observed git-repository-target state and retained across reconciliation while
active source-history records reference the target. If provisioning or the
subsequent git push cannot complete, the host keeps the local artifact truth
and records a failed publication instead of hiding the failure behind fallback
behavior.

## [2026-04-26] implementation | Added approval-gated artifact promotion

Added `references/219-artifact-promotion-slice.md` and advanced B5 of the
Entangle completion plan. Git-backed artifacts that were safely restored
into the artifact restore workspace can now be promoted into the node source
workspace through a host-mediated `artifact-promote` flow.

Promotion requires an approved `source_application` approval scoped to the
artifact/restore tuple, records a durable promotion attempt, rejects unsafe
restore paths and symlinks, and refuses to overwrite existing source files
unless overwrite is explicitly requested.

## [2026-04-26] implementation | Added external session cancellation

Added `references/220-external-session-cancellation-slice.md` and closed the
first external cancellation bridge for Entangle agentic node turns. The
host now persists node-scoped cancellation requests under runtime state, the
shared host client and CLI expose cancellation commands, and the runner observes
requests while idle or mid-turn.

Active turns now receive cancellation as a generic engine `AbortSignal`.
OpenCode-backed turns terminate the child process with `SIGTERM`, and runner
state records cancelled turn/session lifecycle evidence instead of collapsing
operator cancellation into generic failure.

## [2026-04-26] implementation | Added Studio session cancellation controls

Extended `references/220-external-session-cancellation-slice.md` and aligned
Studio with the existing host/runner cancellation bridge. The selected-session
detail panel now derives cancellable node ids from host-backed inspection,
shows the cancellation target set, and requests aggregate cancellation through
the shared host client.

The control remains host-first: Studio does not mutate local session state
directly, and cancelled lifecycle evidence still comes from runner observation
of persisted runtime cancellation requests.

## [2026-04-26] implementation | Wired Studio cancellation event refresh

Studio now treats `session.cancellation.requested` as overview-relevant and
selected-runtime-relevant host activity. Cancellation requests started through
CLI or another host client therefore schedule the same host-backed refresh path
as in-Studio cancellation, instead of depending on a manual operator reload.

## [2026-04-26] implementation | Added Studio artifact promotion controls

Extended `references/219-artifact-promotion-slice.md` and closed the Studio
control gap for approval-gated artifact promotion. The selected artifact detail
panel can now promote the latest restored artifact workspace into the source
workspace through the shared host client when the operator supplies an approved
`source_application` approval id.

The Studio control keeps overwrite disabled by default and remains host-first:
the host validates the artifact/restore approval scope, restore workspace
boundaries, unsafe paths, and target overwrite policy before mutating the node
source workspace.

## [2026-04-26] implementation | Added artifact promotion history inspection

Extended `references/219-artifact-promotion-slice.md` and closed the persisted
promotion-history inspection gap for Entangle artifact promotion. The host
now exposes all-runtime and per-artifact promotion-attempt lists, the shared
host client and CLI consume the same contracts, and Studio shows recent
promotion attempts next to restore history in selected artifact detail.

Promotion records remain runtime-local audit facts under
`runtimeRoot/artifact-promotions`; inspection does not grant promotion rights
or bypass the existing scoped `source_application` approval gate.

## [2026-04-26] implementation | Added direct source-history replay

Added `references/221-source-history-replay-slice.md` and advanced B5 of the
Entangle completion plan. Source-history entries can now be replayed
directly into a node source workspace through host, shared host-client, CLI, and
Studio surfaces without requiring the indirect publish -> restore -> promote
artifact path.

Replay remains policy-bound and conservative. It uses the existing
`source_application` approval policy with resource `source_history:{id}`,
records every replay attempt under `runtimeRoot/source-history-replays`, emits
`source_history.replayed`, writes only when the current workspace still matches
the recorded base tree, and records diverged workspaces as unavailable instead
of overwriting user work.

## [2026-04-26] implementation | Added wiki repository publication

Added `references/222-wiki-repository-publication-slice.md` and advanced the
node memory/artifact bridge for Entangle. A clean node
`wiki-repository` HEAD can now be published through the host as a git-backed
`knowledge_summary` artifact, with durable publication records and typed
`wiki_repository.published` events.

The runner remains the owner of wiki writes and local wiki snapshots. The new
Host, shared host-client, CLI, and Studio surfaces publish only clean
runner-owned repository state and preserve the remaining restore, promotion,
merge, and replication work as explicit follow-up scope.

## [2026-04-26] planning | Added federated runtime redesign pack

Created the federated runtime pivot documentation pack from
`references/221-federated-runtime-redesign-index.md` through
`references/231-implementation-slices-and-verification-plan.md`. The pack
records a fresh audit of the current Local implementation, the OpenCode
reference shape, the target Host Authority and runner federation model, stable
User Node identities, Nostr control/observe protocols, projection-backed Host
state, Studio/CLI operator and user surfaces, migration from local assumptions,
and a controlled implementation/verification plan.

The durable baseline is now Entangle as the product, with Local as one
deployment profile. Current Local docs and code remain valid implementation
history and adapter behavior, but future runtime work should follow the
federated pack before extending Local-only assumptions.

## [2026-04-26] implementation | Added federated runtime contracts

Added `references/232-federated-contracts-slice.md` and implemented the first
federated pivot slice. The shared type package now exports Host Authority,
runner registration, runtime assignment and lease, stable User Node identity,
user interaction gateway, signed envelope, `entangle.control.v1`,
`entangle.observe.v1`, and projection snapshot contracts.

Validator coverage now includes Host Authority, User Node identity, runner
registration, runtime assignment, control event, and observation event
documents. This is still an additive contract slice: Host and runner behavior
remain on the current local adapter until the next slices wire authority
storage, Nostr control/observe transport, registry, assignment lifecycle, and
projection reducers.

## [2026-04-26] implementation | Added Host Authority store and surfaces

Added `references/233-host-authority-store-slice.md` and implemented the
second federated pivot slice. Host now materializes a stable Host Authority
record and Nostr secret on first startup, reports authority status through Host
status, exposes authority inspect/export/import routes, and has internal
Host Authority signing helpers for later control events.

The shared host client and CLI now expose authority show/export/import
surfaces over the same Host boundary. This remains an authority foundation
slice: runner registry, assignment control, and Nostr control/observe transport
are still deferred to the following slices.

## [2026-04-26] implementation | Added Nostr control/observe transport

Added `references/234-nostr-control-observe-transport-slice.md` and
implemented the third federated pivot slice. A new shared
`@entangle/nostr-fabric` package signs explicit inner Nostr events, wraps them
with NIP-59 for private delivery, verifies signer roles and expected Host/runner
identities, and deduplicates received control/observation events.

Host and runner now have thin federated transport wrappers over the same
fabric. Registry, assignment state, and projection reducers remain deferred to
the following slices.

## [2026-04-26] implementation | Added runner registry

Added `references/235-runner-registry-slice.md` and implemented the fourth
federated pivot slice. Host now stores runner registrations and trust state,
stores heartbeat snapshots separately as observed state, projects runner
liveness, exposes runner list/get/trust/revoke API routes, and provides
host-client plus CLI runner surfaces.

Runner observation ingestion is implemented as Host state reducers for hello
and heartbeat. Relay subscription wiring and assignment lifecycle remain
deferred to the following slices.

## [2026-04-26] implementation | Added assignment lifecycle

Added `references/236-assignment-lifecycle-slice.md` and implemented the fifth
federated pivot slice. Host now stores runtime assignment offers and revokes
separately from local runtime intent, requires trusted runners before creating
offers, records assignment accept/reject observations, and exposes assignment
list/get/offer/revoke Host API plus host-client methods.

## [2026-04-26] implementation | Added generic runner join bootstrap

Added `references/237-generic-runner-bootstrap-slice.md` and implemented the
sixth federated pivot slice. The runner now has a generic `join` startup mode
backed by `RunnerJoinConfig`, derives its Nostr identity from env-var or
mounted-file secret delivery, publishes signed `runner.hello`, subscribes to
Host control events, and emits assignment receipts plus signed accepted or
rejected observations.

The existing `effective-runtime-context.json` path remains as explicit
`local-context` compatibility. Assignment execution is now behind an injected
federated materializer boundary, so a generic runner without materialization
rejects assignment offers instead of falsely reporting that a node runtime has
started.

## [2026-04-26] implementation | Added local launcher join adapter bridge

Added `references/238-local-launcher-join-adapter-slice.md` and implemented the
seventh federated pivot slice. Host now writes `runner-join.json` beside the
local runtime context whenever a materialized runtime has relay URLs, using the
Host Authority pubkey, runner identity, relay profile, runtime kind, and engine
capability from the real runtime context.

The Docker backend now supports `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=join`, which
launches the runner with `ENTANGLE_RUNNER_JOIN_CONFIG_PATH` instead of
`ENTANGLE_RUNTIME_CONTEXT_PATH`. The default remains `local-context` until Host
control publishing and the federated assignment materializer are implemented.

## [2026-04-26] implementation | Added Host projection snapshot

Added `references/239-host-projection-snapshot-slice.md` and implemented the
eighth federated pivot slice. Host now exposes `/v1/projection`, built from
Host Authority state, runner registration/heartbeat records, and runtime
assignment records. The projection distinguishes desired-state assignment
records from accepted/rejected assignment observations and includes runner
liveness, trust, operational state, and heartbeat assignment ids.

The shared host client now includes `getProjection()`. This is the first
projection surface only; deep session, turn, approval, artifact, source, and
wiki surfaces still need migration away from runner-local file reads.

## [2026-04-26] implementation | Added stable User Node identities

Added `references/240-user-node-identity-slice.md` and implemented the ninth
federated pivot slice. Host now materializes stable per-graph User Node Nostr
identities, stores their key material behind secret refs, exposes user-node
identity list and inspection APIs, and includes User Node pubkeys in agent
runtime edge routes.

This slice establishes the identity substrate only. Signed User Node tasks,
replies, approvals, inbox/outbox projection, and Studio/CLI user interaction
surfaces remain the next federated runtime work.

## [2026-04-26] implementation | Added signed User Node message publishing

Added `references/241-signed-user-node-messages-slice.md` and implemented the
tenth federated pivot slice. Session launch now signs `task.request` with the
stable User Node identity instead of an ephemeral launch key, and Host exposes
`POST /v1/user-nodes/:nodeId/messages` for local gateways to publish signed
User Node A2A messages to connected runtimes.

The new Host client method `publishUserNodeMessage()` is additive. Existing
Studio/CLI approval controls still use the legacy mutation path until the user
surface slice migrates them onto signed User Node messages.

## [2026-04-26] implementation | Added observed artifact/source/wiki refs

Added `references/242-observed-artifact-source-wiki-refs-slice.md` and
implemented the eleventh federated pivot slice. Host projection snapshots now
include observed artifact refs, source-change refs, and wiki refs from runner
observation payload reducers. The reducers require the current Host Authority
and a registered runner pubkey match before storing projection records.

This is a projection substrate slice. Runner service emission, Host Nostr
observation dispatch, and replacement of legacy runtimeRoot-backed artifact,
source, and wiki APIs remain follow-up work.

## [2026-04-26] implementation | Added Studio and CLI federation surfaces

Added `references/243-studio-cli-federation-surfaces-slice.md` and implemented
the twelfth federated pivot slice. CLI now exposes assignment list/get/offer/
revoke commands, `host nodes assign`, User Node identity inspection, signed User
Node message publication, projection-backed inbox list/show, and top-level
reply/approve/reject commands that publish signed User Node A2A messages.

Studio now loads the Host projection and User Node identities during overview
refresh and shows a federation panel with projection freshness, runner and
assignment counts, artifact/source/wiki ref counts, User Node identities, and
projected User Node conversations. Full Studio chat composition and replacement
of legacy approval/session controls with signed User Node flows remain
follow-up work.

## [2026-04-26] implementation | Migrated current product naming to Entangle

Added `references/244-product-naming-migration-slice.md` and implemented the
thirteenth federated pivot slice. New Host-created and local-repair-created
state layout records now use product marker `entangle`, and the schema accepts
only that product marker.

Current README, resources, deployment, wiki overview, and CLI local-profile
wording now describe Entangle as the product and local as a deployment profile.
Same-machine Docker/network names, backup bundle markers, diagnostics names,
workspace layout names, and runtime profile fixtures no longer use a separate
local product identity.

## [2026-04-26] implementation | Removed remaining local product markers

Corrected the naming migration after the federated pivot decision became
stricter: there is no legacy product marker and no local runtime profile in the
active codebase. The canonical runtime profile is now only `"federated"`, Host
state layout records parse only product marker `entangle`, and the old Local
Preview graph fixture has been renamed to the deployment-agnostic Federated
Preview example under `examples/federated-preview/`.

## [2026-04-26] implementation | Added Host control observation bridge

Added `references/245-host-control-observation-bridge-slice.md` and the
Host-side `HostFederatedControlPlane`. The bridge ingests signed runner
observation events, records runner hello/heartbeat state, acknowledges hello
events with signed Host control payloads, routes assignment accepted/rejected
observations into assignment state, and publishes assignment offer/revoke
control payloads through the federated transport abstraction.

This is still a bridge, not complete distributed execution. Host startup wiring,
policy-based relay selection, and runner assignment materialization remain the
next gaps before the same-machine adapter and remote runners can share one
canonical control/observe execution path.

## [2026-04-26] verification | Added federated control plane smoke

Added `references/246-federated-control-plane-smoke-slice.md` and
`pnpm ops:smoke-federated-control`. The smoke runs Host state and runner
materialization in separate temporary roots, starts a generic runner from
`runner-join.json`, sends signed runner observations over an in-memory
control/observe bus, publishes signed Host control events, accepts an
assignment in runner-owned storage, and verifies Host projection marks the
assignment as observation-sourced.

This is not the final distributed smoke because it does not use a live relay or
real remote process boundary, but it is now a fast regression gate for the
federated protocol semantics that the same-machine deployment adapter must
eventually use.

## [2026-04-26] implementation | Wired Host startup to federated control plane

Added `references/247-host-startup-control-plane-wiring-slice.md` and
`services/host/src/host-federated-runtime.ts`. Host startup now resolves
control/observe relay URLs from catalog default relay profiles, loads the Host
Authority signing key, subscribes to runner observations addressed to that
authority, and closes the subscription with the Host server lifecycle.

Assignment offer and revoke API mutations now publish signed control payloads
through the active federated bridge when Host is running with control-plane
transport. This is still not the final distributed runtime: relay health,
durable Host control outbox/retry, runner materialization, and a live relay
smoke remain open.

## [2026-04-26] implementation | Added default runner assignment materializer

Added `references/248-runner-default-assignment-materializer-slice.md` and
`services/runner/src/assignment-materializer.ts`. Generic joined runners now
have a default filesystem materializer, so valid signed assignment offers are
recorded in runner-owned storage and accepted instead of being rejected because
no materializer was injected. Runner join config can also declare a Host API
bootstrap endpoint; when present, the materializer fetches and persists the
Host-projected runtime context beside the assignment record.

This closes the first runner-side gap after Host control startup. It does not
yet rebase that context into fully executable runner-owned workspaces or start
the assigned node runtime from the materialized assignment; those remain the
next runner execution slices.

## [2026-04-26] implementation | Projected runtime status from runner observations

Added `references/249-runtime-status-observation-projection-slice.md` and
routed signed `runtime.status` observations through the Host federated control
plane. Host now verifies the registered runner identity, writes observed
runtime records as `backendKind: "federated"`, and emits
`runtime.observed_state.changed` events from runner-reported runtime state.

This closes another Host-side filesystem assumption for runtime observability.
The runner still needs to emit these status events from assignment-driven node
execution, and Studio/CLI still need the federated runtime projection surfaced
through their normal Host read paths.

## [2026-04-26] implementation | Renamed active deployment surfaces to federated dev

Added `references/250-federated-dev-deployment-naming-cleanup-slice.md` and
removed the remaining same-machine-era names from active operator surfaces. The
active Compose profile now lives under `deploy/federated-dev`, root operations
use `ops:check-federated-dev` and `ops:smoke-federated-dev:*`, and the CLI
reliability group is now `entangle deployment` instead of the previous same-machine command group.

The default engine and catalog IDs are now `opencode-default` and
`default-catalog`, the default runner image is
`entangle-runner:federated-dev`, and state-layout contracts no longer export
`localStateLayout*` names. Conversation initiator values are now `self/peer`
instead of `local/remote`.

## [2026-04-26] implementation | Started assigned node runtimes from runner materialization

Added `references/251-runner-assignment-runtime-start-slice.md` and extended
generic joined runners so assignment materialization can start the assigned node
runtime from a runner-owned `runtime-context.json`. The join service now emits
signed `runtime.status` observations for starting, running, failed, and stopped
states, and stops active assignment runtimes on revoke or runner shutdown.

This closes the runner-side gap left after runtime status projection: a runner
can now accept an assignment only after the node runtime has actually started.
Lease renewal, restart/backoff supervision, and live relay smoke coverage remain
future execution-hardening work.

## [2026-04-26] implementation | Surfaced federated runtime projection

Added `references/252-federated-runtime-projection-surface-slice.md` and
extended Host projection with runtime records derived from observed runtime
state, runtime intents, and assignment records. Signed runner `runtime.status`
observations now persist runner and assignment identity so the projection can
show which runner reported a node runtime state.

Studio now shows projected runtime counts and compact runtime rows in the
federation panel, while CLI gained `entangle host projection` for the same Host
projection snapshot. The older detailed runtime inspection APIs still exist for
deep detail until their filesystem-backed reads are replaced.

## [2026-04-26] implementation | Added live relay federated smoke

Added `references/253-live-relay-federated-smoke-slice.md` and
`pnpm ops:smoke-federated-live-relay`. The smoke uses the real Host and runner
Nostr transports against a reachable relay, keeps Host and runner state in
separate temp roots, registers a generic runner, sends assignment control over
the relay, receives runner-signed assignment/runtime observations, and projects
a git-backed artifact ref.

The smoke passed against the federated dev `strfry` service on
`ws://localhost:7777`. It is still a same-machine process smoke; the remaining
hardening path is a separate-process and eventually multi-machine distributed
demo.

## [2026-04-26] implementation | Removed public runtime context path leakage

Added `references/255-public-runtime-api-path-boundary-slice.md` and removed
`contextPath` from the public runtime inspection contract. Host now keeps the
materialized context path only in a private `RuntimeInspectionInternal` shape
for remaining detail readers, while Host API, host-client, Studio, and CLI
runtime summaries stay path-free.

Runtime recovery fingerprinting now normalizes through the public runtime
schema before hashing, so private Host-only fields cannot create duplicate
recovery snapshots. The remaining filesystem-backed detail endpoints are still
tracked as projection-migration work.

## [2026-04-26] implementation | Added portable runner bootstrap bundles

Added `references/256-portable-runtime-bootstrap-bundle-slice.md` and a
token-gated `GET /v1/runtimes/:nodeId/bootstrap-bundle` Host API. The bundle
contains a runtime context with sanitized workspace placeholders plus
package/memory file snapshots with sha256 and size metadata.

The default joined runner materializer now fetches that bundle instead of the
raw context endpoint, verifies snapshot metadata, and writes package/memory
files into the runner-owned assignment workspace. This removes the default
runner bootstrap dependency on copying from Host-local context paths.

Follow-up: `packages/host-client` and CLI now expose the same portable bundle
through `getRuntimeBootstrapBundle()` and
`entangle host runtimes bootstrap-bundle <nodeId>`, while the older runtime
context command is labeled as debug-oriented.

## [2026-04-26] implementation | Added no-LLM User Node intake to process smoke

Extended `pnpm ops:smoke-federated-process-runner` so the runnable federated
path now verifies more than startup. The smoke uses per-run identifiers,
starts Host and a real joined runner process with separate state roots, assigns
the builder node through signed control events, starts the assigned runtime
from a portable bootstrap bundle, publishes a signed `question` message from
the User Node over the live relay, and verifies that the runner persisted the
received session and conversation.

The slice also normalizes blank live relay publish acknowledgements from
`nostr-tools` to the configured relay URL, avoiding false Host API conflicts
after successful User Node message publication. Live OpenCode/model-provider
execution remains intentionally manual for now so the smoke can run without API
keys.

Follow-up: the same smoke now supports `--keep-running`, which leaves the Host
server and joined runner alive after the no-LLM checks and prints CLI commands
for sending a signed `task.request` to the assigned builder node. This gives
manual API-backed OpenCode testing a runnable starting point without rebuilding
the Host/runner/relay/assignment setup by hand.

## [2026-04-26] implementation | Projected federated User Node conversations

Added `references/257-federated-session-conversation-observations-slice.md`.
Joined node runtimes now publish signed `session.updated`,
`conversation.updated`, and `turn.updated` observations through the runner
observation transport, and Host records those observations into
session/conversation activity state plus `runner.turn.updated` events.

Host projection now derives `userConversations` from observed conversation
activity when the active graph identifies a User Node participant. The process
runner smoke now verifies the full no-LLM path: signed User Node publish,
runner-owned intake, runner-signed observation, and Host projection of the User
Node conversation. Runner tests now cover turn phase observation publication
for executable messages.

Follow-up: the CLI projection summary now reports the projected User Node
conversation count, and `--keep-running` prints an inbox command so manual
OpenCode testing can immediately inspect the User Node projection after sending
a signed task. The harness now also prints a filtered `host events list`
command for `runner.turn.updated` events on the assigned builder node.

## [2026-04-26] planning | Realigned User Node runtime boundary

Added `references/258-human-interface-runtime-realignment-plan.md` and updated
the federated runtime plan to keep Studio as the admin/operator surface while
moving participant workflows into a dedicated User Client launched by a running
User Node `human_interface` runtime.

The next fast product path is now explicit: make User Nodes assignable to
`human_interface` runners, start a minimal Human Interface Runtime from the
joined runner, expose a User Client endpoint through Host projection, and then
expand durable inbox/outbox, approvals, artifact review, and OpenCode runtime
depth.

The plan also records that multi-user support is a placement requirement:
different human graph nodes can run on different `human_interface` runners, so
each human participant may reside where their assigned node runtime is running.

## [2026-04-26] implementation | Added minimal Human Interface Runtime

User Nodes now map to `human_interface` assignments instead of being rejected
by Host assignment. Focused Host tests cover compatible human-interface
runners, incompatible agent-only runners, and two User Nodes assigned to
distinct `human_interface` runners.

Host can now export portable User Node bootstrap bundles and authenticated User
Node identity secrets for runner materialization. Joined runners branch on
assignment runtime kind: agent nodes still start the agent service, while
`human_interface` assignments start a minimal first-party HTTP User Client with
`/health` and Host-backed message publication.

Runner `runtime.status` observations can include `clientUrl`. Host persists and
projects that endpoint, Studio exposes an `Open User Client` action for runtime
projection rows with a client URL, and the CLI projection summary includes the
same endpoint.

## [2026-04-26] verification | Extended process smoke with User Node runner

Extended `pnpm ops:smoke-federated-process-runner` so the fastest runnable
federated proof now launches two real joined runner processes: one agent runner
and one User Node `human_interface` runner. The smoke trusts both runners,
assigns the builder node and the User Node through signed control events,
verifies runner-owned materialized runtime contexts, waits for the projected
User Client endpoint, checks the User Client `/health` route, publishes a
signed User Node message, verifies agent-runner session/conversation intake,
and verifies Host projection of the User Node conversation.

The smoke passed against the federated dev `strfry` relay on
`ws://localhost:7777`. The same-machine proof now exercises the intended
topology without depending on Host/runner shared filesystem state; the next
runtime-facing gaps are durable User Client inbox/outbox, approval/artifact
review in the User Client, second-User-Node runtime coverage, and the eventual
multi-machine proof.

## [2026-04-26] implementation | Added User Node inbox client boundary

Added `references/259-user-node-inbox-client-slice.md`. Host now exposes a
User Node-specific inbox endpoint at `/v1/user-nodes/:nodeId/inbox`, and
projected User Node conversations carry status, session id, last message type,
and artifact ids when available from signed conversation observations.

The shared host client exposes `getUserNodeInbox()`, CLI inbox commands use the
new endpoint, and the Human Interface Runtime now serves a more usable User
Client shell with `/api/state`, conversation list, selected thread metadata,
and message publishing that preserves selected conversation/session context.
The browser still never receives the Host bearer token; publishing remains
server-side through the Host User Node gateway.

Focused typechecks, focused tests, package lints, and
`pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
passed after the change. The process smoke now also verifies the User Client
`/api/state` response for the assigned User Node and builder edge target.

## [2026-04-26] verification | Proved two User Nodes on distinct runners

Added `references/260-multi-user-human-runtime-smoke-slice.md` and extended
`pnpm ops:smoke-federated-process-runner` with a second human graph node named
`reviewer-user`. The smoke now starts Host, one agent runner, and two
`human_interface` runner processes, each with its own runner id, key, join
config, assignment, state root, and User Client endpoint.

The smoke passed against the federated dev `strfry` relay on
`ws://localhost:7777`. It verified both User Client `/health` and `/api/state`
responses, published signed messages from both User Nodes to the builder,
asserted distinct User Node pubkeys, verified both sessions/conversations in
the agent runner state, projected both User Node conversations through Host,
and checked Host/agent-runner/two-User-runner filesystem isolation.

## [2026-04-26] implementation | Added User Node outbound message history

Added `references/261-user-node-message-history-slice.md`. Host now records
outbound User Node messages published through `/v1/user-nodes/:nodeId/messages`
under observed state and exposes them through
`/v1/user-nodes/:nodeId/inbox/:conversationId`.

The shared host client exposes `getUserNodeConversation()`, CLI `inbox show`
uses the conversation detail endpoint, and the Human Interface Runtime renders
recorded outbound messages for the selected thread. This is intentionally the
first outbox/history subset; inbound agent-to-user message records, delivery
state, approval controls, and artifact review remain separate work.

Focused typechecks, focused tests, package lints, and
`pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
passed after the change. The process smoke now verifies outbound message
history for both User Nodes and preserves Host/runner/User-runner filesystem
isolation.

The smoke also exposed a runtime projection race where an older `starting`
observation could overwrite a newer `running` observation. Host runtime-status
observation writes are now serialized and stale startup observations are ignored
when a current running projection is already present.

## [2026-04-26] implementation | Added User Node inbound message intake

Added `references/262-user-node-inbound-message-intake-slice.md`. The Human
Interface Runtime now subscribes to A2A messages as the assigned User Node when
identity key material is available, validates that inbound envelopes are
addressed to that User Node, and forwards bounded records to Host through
`POST /v1/user-nodes/:nodeId/messages/inbound`.

Host records those inbound messages under the same User Node message-history
store used for outbound messages and folds message records into User Node inbox
projection, so conversations can appear from message history even before a
runner conversation observation exists. The User Client renders inbound and
outbound records through the existing conversation detail surface.

Focused typechecks, focused tests, package lints, and
`node --check scripts/smoke-federated-process-runner.mjs` passed for the
changed `types`, `host`, and `runner` surfaces. The relay-backed
`pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
smoke passed with `user-node-inbound-message-history`, two User Node runtimes,
and Host/runner/User-runner filesystem isolation.

## [2026-04-26] implementation | Added User Node approval controls

Added `references/263-user-node-approval-controls-slice.md`. User Node message
records now preserve approval metadata from inbound `approval.request` messages
and outbound `approval.response` messages. Host folds approval request/response
records into User Node conversation projection pending approval ids.

The runner-served User Client renders approval metadata in message history and
adds approve/reject controls that post `approval.response` messages through the
existing Host User Node gateway, preserving conversation, session, parent
message, target node, and selected User Node identity.

Focused typechecks, focused tests, and package lints passed for the changed
`types`, `host`, and `runner` packages, and
`node --check scripts/smoke-federated-process-runner.mjs` passed. The
relay-backed
`pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
smoke passed with `user-node-approval-request`,
`user-node-approval-response`, two User Node runtimes, and filesystem
isolation.

## [2026-04-26] implementation | Rendered User Node artifact refs

Added `references/264-user-node-artifact-ref-rendering-slice.md`. The
runner-served User Client now renders bounded artifact refs attached to message
records, including artifact id, backend, kind, summary, and git/wiki/local-file
locator details. This is display-only; artifact preview, source diff review,
wiki review, and permission-aware artifact actions remain explicit follow-up
work.

Runner focused tests now cover rendering an attached git artifact ref on the
conversation page. The process runner smoke synthetic agent-to-user message now
includes a git artifact ref and asserts Host conversation detail preserves it.
Host and runner typechecks, runner tests, runner lint, and
`node --check scripts/smoke-federated-process-runner.mjs` passed before the
relay-backed smoke rerun. The relay-backed
`pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
smoke passed after adding the artifact ref to the synthetic agent-to-user
message.

## [2026-04-26] implementation | Added User Client artifact preview

Added `references/265-user-node-artifact-preview-slice.md`. The runner-served
User Client now renders a `Preview` action for artifact refs in message
history and serves a server-side `/artifacts/preview` page that calls the Host
artifact preview endpoint with the Human Interface Runtime's Host credentials.

The browser-facing page shows bounded preview content, content type,
truncation status, or an unavailable reason, and intentionally does not render
the Host preview response's runtime-local `sourcePath`. This gives human graph
participants a first artifact-inspection workflow inside their own running
User Node client while keeping projection-backed artifact preview as the next
architecture cleanup.

Runner typecheck, focused runner tests, runner lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Added CLI scoped User Node approval context

Added `references/272-cli-user-node-approval-context-slice.md`. CLI signed
User Node approval responses now match the User Client's approval-response
shape: `entangle approve`, `entangle reject`, and generic
`entangle user-nodes message` publishing can carry optional
operation/resource/reason context on signed `approval.response` metadata.

The new CLI helper validates operations and resource scopes through the
canonical policy schemas and rejects partial approval context instead of
silently dropping it. CLI typecheck, focused CLI tests, CLI lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Preferred projected source diff excerpts in User Client

Added `references/273-user-client-projected-source-diff-excerpt-slice.md`.
The runner-served User Client source-change review page now fetches Host
projection first and renders a matching projected
`sourceChangeSummary.diffExcerpt` without calling the runtime-local
source-change diff endpoint.

The previous Host runtime diff endpoint remains a fallback for records that do
not yet have projected diff evidence. Runner typecheck, focused runner tests,
runner lint, `node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Added Studio User Node runtime summaries

Added `references/274-studio-user-node-runtime-summary-slice.md`. Studio's
federation overview now joins User Node identities with runtime projection and
User Node conversation projection so operators can see runtime state, runner
placement, User Client URL, conversation count, active count, pending approval
count, unread count, gateway count, and public-key prefix per User Node.

This keeps Studio in the admin/operator role: it links to the running User
Client instead of becoming the participant chat surface. Studio typecheck,
focused Studio tests, Studio lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Added CLI approval responses from inbox messages

Added `references/275-cli-user-node-approval-from-message-slice.md`. CLI
`approve` and `reject` can now use `--from-message <eventId>` to locate a
recorded inbound User Node `approval.request` and publish a signed
`approval.response` that preserves the original approval id, target node,
conversation id, session id, parent event id, turn id, and scoped
operation/resource/reason context.

Manual approval id plus `--target-node` flows still work. CLI typecheck,
focused CLI tests, CLI lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Added direct User Node message lookup

Added `references/276-user-node-message-lookup-slice.md`. Host now exposes
`GET /v1/user-nodes/:nodeId/messages/:eventId` over recorded User Node message
state, with a shared host-client method and contract schema. CLI
`approve/reject --from-message` now uses this direct lookup instead of scanning
every projected conversation.

Types, Host, host-client, and CLI typechecks passed, along with types tests,
focused Host tests, focused CLI tests, package lints,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check`.

## [2026-04-28] implementation | Projected source-change summaries from observed refs

Added `references/270-source-change-ref-summary-projection-slice.md`.
`source_change.ref` observation payloads and Host source-change projection
records now carry the runner's bounded `sourceChangeSummary`.

The joined-runner observation publisher includes the persisted candidate
summary, Host reducers store it, and type/Host tests now cover the richer
observation and projection shape. This lets source candidates be listed and
triaged from Host projection without requiring immediate access to
runner-local source snapshot files.

Types, Host, and runner typechecks passed, along with types tests, focused Host
tests, focused runner tests, package lints,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check`.

## [2026-04-28] implementation | Rendered projected source summaries in User Client

Added `references/271-user-client-source-summary-projection-slice.md`. The
runner-served User Client now fetches Host projection alongside the User Node
inbox and renders bounded projected source-change summaries on approval
request cards that target a matching `source_change_candidate`.

The card now shows file count, additions/deletions, changed-file rows, and the
existing `Review diff` action. This makes source approval triage useful from
the running User Node surface while the deeper diff route remains a separate
projection-backed content migration.

Runner typecheck, focused runner tests, runner lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-26] implementation | Preserved scoped approval response context

Added `references/267-user-node-approval-response-context-slice.md`. User Node
`approval.response` messages can now carry optional operation, resource, and
reason metadata in addition to approval id and decision.

The Human Interface Runtime sources those fields from the inbound approval
request card and includes them in the signed response publish request. Host
preserves the same context when recording outbound User Node approval
responses and when recording inbound approval responses from other nodes. This
keeps the signed user decision self-describing without changing runner
approval-gate semantics, which still resolve execution by approval id.

Types, Host, and runner typechecks passed, along with types tests, focused
Host/runner tests, package lints,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check`.

## [2026-04-26] implementation | Added User Client delivery labels

Added `references/268-user-client-message-delivery-state-slice.md`. The
runner-served User Client now renders derived delivery labels in message
history: outbound messages show relay publish coverage and inbound messages
show receipt by the User Client.

This does not implement protocol-level read receipts or retry history, but it
makes the running User Node client clearer without changing schemas or
transport behavior.

Runner typecheck, focused runner tests, runner lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-26] implementation | Added User Client source-change diff preview

Added `references/266-user-node-source-change-diff-preview-slice.md`. The
runner-served User Client now renders approval resource metadata and shows a
`Review diff` action when an inbound approval request targets a
`source_change_candidate`.

The new server-side `/source-change-candidates/diff` route calls the Host
source-change candidate diff endpoint with the Human Interface Runtime's Host
credentials and renders bounded diff content, candidate summary, file list,
truncation status, or an unavailable reason. This lets a human graph
participant inspect the concrete source change before publishing a signed
approval response, while projection-backed source review remains a required
architecture cleanup.

Runner typecheck, focused runner tests, runner lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Emitted observed work refs from runners

Added `references/269-runner-observed-ref-emission-slice.md`. Joined agent
runners now emit `artifact.ref`, `source_change.ref`, and `wiki.ref`
observations during normal turn execution, using the same non-blocking
observation behavior already used for session, conversation, and turn updates.

The runner now publishes artifact refs for retrieved, failed-retrieval, and
produced artifact records; source-change refs when candidates are persisted;
wiki refs when wiki-repository sync has a concrete snapshot commit; and a final
turn observation after wiki sync so Host projection can receive the sync
outcome through the observe protocol.

Runner typecheck, focused runner tests, runner lint,
`node --check scripts/smoke-federated-process-runner.mjs`, and
`git diff --check` passed for this slice.

## [2026-04-28] implementation | Added projected artifact previews

Added `references/277-projected-artifact-preview-slice.md`. `artifact.ref`
observations can now carry bounded text previews, Host projection stores them,
and the runner-served User Client prefers projected artifact preview content
before falling back to the older runtime artifact preview endpoint.

Runner-produced report artifacts now emit preview excerpts without exposing
runtime-local source paths through the projection. Types, Host, and runner
typechecks passed, along with types tests, focused Host/runner tests, and
`git diff --check` during the implementation slice.

## [2026-04-28] implementation | Added User Node local read state

Added `references/278-user-node-local-read-state-slice.md`. Host now stores
per-User-Node conversation read markers, projection exposes `lastReadAt`, and
unread counts are computed from inbound messages newer than that marker.

The runner-served User Client marks the selected conversation read when a human
opens it, `packages/host-client` exposes the read mutation, and CLI now has
`entangle inbox read <conversationId> --user-node <nodeId>`. This is local
User Node inbox state, not a federated A2A read receipt.

## [2026-04-28] implementation | Rendered projected wiki refs in User Client

Added `references/279-user-client-wiki-ref-projection-slice.md`. The
runner-served User Client state now carries Host-projected `wikiRefs`, and the
selected thread renders peer wiki refs with artifact id, summary, locator, and
observed time. Wiki-scoped approval requests also render matching projected
wiki refs inside the message card.

This keeps node memory/wiki visible to the human User Node through Host
projection without reading runner-local wiki files or pushing wiki content
through Nostr.

## [2026-04-28] implementation | Added signed User Node read receipts

Added `references/280-user-node-read-receipt-slice.md`. A2A now supports
`read.receipt`, User Node publish contracts accept it, and the runner-served
User Client publishes a signed read receipt when an opened conversation had
unread inbound messages before being marked read locally.

The local read marker remains the inbox source of truth; the read receipt is a
peer-visible signed notification carried through the existing User Node
gateway.

## [2026-04-28] implementation | Projected bounded wiki previews

Added `references/281-projected-wiki-preview-slice.md`. `wiki.ref`
observations and Host projection now carry optional bounded wiki preview
content, joined runners emit previews from their runner-owned wiki repository,
and the User Client renders the preview from projection.

This keeps human-node wiki review on the federated observation path while
leaving full wiki repositories in git/object-backed artifact space.

## [2026-04-28] fix | Added process runner relay preflight

Added `references/282-process-runner-smoke-relay-preflight-slice.md`. The
process runner smoke now checks the configured Nostr relay with a WebSocket
REQ/EOSE preflight before creating Host and runner processes.

When the relay is unavailable, the smoke now reports the missing relay
prerequisite and the federated dev `strfry` startup command instead of exposing
the lower-level Nostr pool `connection failed` error. The same pass also
aligned the smoke's synthetic artifact ref with the current preferred-ref
contract.

## [2026-04-28] implementation | Preserved User Node parent message links

Added `references/283-user-node-parent-message-read-model-slice.md`. User Node
message records now preserve optional A2A `parentMessageId` values for inbound
and outbound messages, and the runner-served User Client renders the parent
link in conversation history.

This makes human-node conversation state less flat and gives future delivery
retry and thread repair work a durable parent/child message link to build on.

## [2026-04-28] implementation | Added User Node delivery retry state

Added `references/284-user-node-delivery-retry-state-slice.md`. User Node
message publish now records per-relay delivery status instead of dropping the
outbox record when relay publication fails. Outbound message records can be
`published`, `partial`, or `failed`; inbound records are marked `received`.

The runner-served User Client now renders failed relay delivery details and a
retry action that republishes through the existing signed User Node gateway
while preserving conversation, session, parent-message, and approval context.

## [2026-04-28] implementation | Added Studio wiki publication retry

Added `references/285-studio-wiki-publication-retry-slice.md`. Studio now
detects non-published wiki repository publication attempts for the selected
runtime and sends `retry: true` through the existing Host API, matching the CLI
retry capability.

This closes the operator-side wiki publication action gap without adding a new
protocol or Host contract.

## [2026-04-28] implementation | Added bounded OpenCode tool evidence

Added `references/286-opencode-tool-evidence-slice.md`. The OpenCode adapter
now preserves bounded generic tool evidence from `opencode run --format=json`
events: tool titles, redacted input summaries, output summaries, durations,
and OpenCode call ids when present.

The shared runtime-turn and runtime-trace presentation helpers now surface this
evidence for CLI and Studio consumers, and memory synthesis receives tool title
and duration context without embedding raw provider event payloads.

## [2026-04-28] implementation | Added User Client runtime status and live refresh

Added `references/287-user-client-runtime-status-live-refresh-slice.md`. The
runner-served User Client now includes runtime identity, Host API, primary
relay, relay URLs, and target-node status in `/api/state` and in the rendered
page.

The page now computes a bounded state fingerprint and polls `/api/state` so it
can reload when inbox, source-change, or wiki projection state changes, without
moving user-node chat ownership into Studio.

## [2026-04-28] implementation | Added User Client source candidate review

Added `references/288-user-client-source-candidate-review-slice.md`. The
runner-served User Client now renders accept/reject controls for
`source_change_candidate` approval resources and on the source diff page.

The Human Interface Runtime submits the existing Host source-candidate review
mutation with `reviewedBy` set to the running User Node id. This gives the
human-node client a concrete source review action without making Studio the
user-node UI and without conflating review with source application or
publication.

## [2026-04-28] implementation | Added OpenCode server health probe

Added `references/289-opencode-server-health-probe-slice.md`. OpenCode engine
profiles with `baseUrl` now probe the attached server's `/global/health`
endpoint before launching `opencode run --attach`.

The probe reuses OpenCode server Basic auth environment variables when present,
records combined CLI/server version evidence, and fails as
`provider_unavailable` before the run process starts if the server is
unreachable or unhealthy.

## [2026-04-28] implementation | Added Human Interface JSON API

Added `references/290-human-interface-json-api-slice.md`. The runner-served
Human Interface Runtime now exposes `GET /api/conversations/:conversationId`
and `POST /api/messages` alongside `/api/state`.

These local JSON routes let a bundled or external User Client consume the
running User Node boundary without scraping HTML, while message publishing
still goes through the existing Host User Node gateway and stable User Node
identity path.

## [2026-04-28] verification | Covered Human Interface JSON API in process smoke

Added `references/291-human-interface-json-api-smoke-slice.md`. The process
runner smoke now publishes the primary User Node message through the running
User Client `POST /api/messages` route, reads the selected conversation through
`GET /api/conversations/:conversationId`, and sends the approval response
through the same JSON publish route.

The smoke still verifies agent-runner intake, Host projection, and User Node
conversation history, so the JSON client path remains tied to signed User Node
behavior rather than a Studio/operator shortcut.

## [2026-04-28] implementation | Added dedicated User Client app

Added `references/292-dedicated-user-client-app-slice.md` and
`apps/user-client`. The new Vite/React app is the first dedicated human graph
participant surface outside Studio.

It consumes the Human Interface Runtime JSON API for runtime status, selected
conversation detail, message publishing, and approval responses. The runner
server-rendered shell remains available while deployment packaging decides
whether built assets are included by default.

## [2026-04-28] implementation | Added runtime-served User Client assets

Added `references/293-runtime-served-user-client-assets-slice.md`. The Human
Interface Runtime can now serve dedicated User Client static assets from
`ENTANGLE_USER_CLIENT_STATIC_DIR` for `/`, `/index.html`, `/assets/*`, and
`/favicon.ico`.

The dynamic runtime APIs remain under `/api/*`, and the server-rendered shell
continues to be the fallback when no static asset directory is configured.

## [2026-04-28] implementation | Packaged Docker User Client runtime assets

Added `references/294-docker-user-client-packaging-slice.md`. The federated dev
runner image now builds and bundles `apps/user-client`, sets
`ENTANGLE_USER_CLIENT_STATIC_DIR=/app/user-client`, and verifies the static app
payload during image build.

The Docker launcher adapter can now publish a host port and public User Client
URL for User Node runtime contexts, so projected User Client links can be
opened from the operator workstation instead of pointing at container-internal
loopback addresses when that adapter is used.

## [2026-04-28] implementation | Added User Client review JSON actions

Added `references/295-user-client-review-json-actions-slice.md`. The Human
Interface Runtime now exposes local JSON routes for projection-first artifact
preview, projection-first source-change diff preview, and source-candidate
accept/reject review stamped with the running User Node id.

The dedicated `apps/user-client` app now uses those routes for artifact
preview, source diff loading, source-candidate review, and related wiki preview
cards, reducing the capability gap between the bundled app and the
server-rendered fallback shell.

## [2026-04-28] verification | Process smoke can serve dedicated User Client assets

Added `references/296-process-smoke-dedicated-user-client-assets-slice.md`. The
process-runner smoke now accepts `--user-client-static-dir`, auto-detects
`apps/user-client/dist` when present, passes it to joined runner processes as
`ENTANGLE_USER_CLIENT_STATIC_DIR`, and validates that the running User Node
runtime serves the dedicated app shell before continuing through the JSON API.

## [2026-04-28] implementation | Added CLI User Client endpoint discovery

Added `references/297-cli-user-client-endpoints-slice.md`. The CLI now exposes
`entangle user-nodes clients`, which joins active User Node identities with the
Host projection and reports Human Interface Runtime observed state, runner
placement, assignment id, and User Client URL.

This keeps Studio as the operator surface while making the human-node client
endpoint discoverable from a headless Host boundary.

## [2026-04-28] implementation | Added Studio runtime assignment control

Added `references/298-studio-runtime-assignment-control-slice.md`. Studio's
Federation panel now includes a Host-backed assignment offer form for selecting
an active graph node, a trusted runner, and a lease duration.

The form calls the Host assignment API through `host-client`, refreshes the
projection after success, and keeps runner control-plane authority in Host
rather than direct Studio-runner communication.

## [2026-04-28] implementation | Added Studio runtime assignment revocation

Added `references/299-studio-runtime-assignment-revocation-slice.md`. Studio's
Federation panel now lists Host-projected runtime assignments and exposes a
Host-backed revoke action for revocable assignment states.

This gives Studio the first complete offer/revoke assignment loop while keeping
the canonical control-plane transition inside Host.

## [2026-04-28] implementation | Added Host transport health status

Added `references/300-host-transport-health-slice.md`. Host status now includes
bounded federated control/observe transport health for the Host-owned relay
subscription lifecycle: disabled, not started, subscribed, degraded, or
stopped, with configured relay URLs and last startup failure metadata.

The shared host-client, CLI host-status summary, and Studio Host Status panel
now render the same Host read model, while deeper per-relay diagnostics remain
future work.

## [2026-04-28] implementation | Added runner join-config CLI

Added `references/301-runner-join-config-cli-slice.md`. The CLI now exposes
`entangle runners join-config`, which reads Host status, derives Host Authority
and relay defaults, and writes a validated generic `runner-join.json` without
embedding secrets.

The runner package now advertises an `entangle-runner` bin for
`join --config`, so generic runner startup is documented as an operator path
rather than only as smoke-script internals.

## [2026-04-28] implementation | Added runner join heartbeats

Added `references/302-runner-heartbeat-loop-slice.md`. Generic joined runners
now emit periodic signed `runner.heartbeat` observations through the existing
observe transport after `runner.hello`, carrying accepted assignment ids and a
capacity-derived operational state.

This closes the runner-side liveness gap for remote runners without adding
shared filesystem assumptions or changing existing assignment event order.

## [2026-04-28] implementation | Added runner heartbeat join-config and smoke coverage

Added `references/303-runner-heartbeat-config-smoke-slice.md`. Runner join
configs now accept optional `heartbeatIntervalMs`, the CLI can write it through
`entangle runners join-config --heartbeat-interval-ms`, and compact summaries
include the configured cadence.

The process-runner smoke now writes short heartbeat intervals into its temporary
join configs and waits for Host-projected heartbeats from the agent runner and
both User Node runners before continuing.

## [2026-04-28] documentation | Fixed active deployment profile index

Added `references/304-deployment-index-profile-cleanup-slice.md`.
`deploy/README.md` now points at `deploy/federated-dev/README.md` and describes
same-workstation operation as the active federated development profile rather
than a separate local product profile.

## [2026-04-28] documentation | Refined current gap summary

Updated `wiki/overview.md` so the top-level project state no longer describes
Host-runner federation and stable User Node signing as the largest current
gaps. The current gap summary now reflects the live joined-runner/User Client
smoke path and focuses remaining work on projection-backed deep detail APIs,
Docker launcher rebasing, and the multi-machine distributed proof.

## [2026-04-28] implementation | Preserved observed remote session projection

Added `references/305-observed-session-projection-pruning-slice.md`. Observed
activity records now distinguish signed `observation_event` projection records
from same-workstation `runtime_filesystem` compatibility imports.

Local runtime activity synchronization now prunes stale filesystem-imported
activity without deleting signed remote observations, and the Host session list
can surface projected remote sessions that do not have a Host-readable runner
session file.

## [2026-04-28] implementation | Added projected session inspection fallback

Added `references/306-projected-session-inspection-slice.md`. The Host session
detail route now falls back to bounded projection-backed inspection for observed
remote sessions when local runtime filesystem detail is unavailable.

The fallback reconstructs public runtime summary fields from Host runtime
projection and keeps local `contextPath`/`runtimeRoot` details out of the
response.

## [2026-04-28] implementation | Added signed approval observations

Added `references/307-approval-observation-projection-slice.md`. The observe
protocol now allows `approval.updated` events to carry a bounded full approval
record, joined runners publish those events when approval gates are created or
transitioned, and Host reduces them into observed approval activity plus typed
approval trace events.

This makes approval status counts in projected remote session summaries/details
come from signed runner observations instead of only from same-workstation
approval files.

## [2026-04-28] implementation | Added projected approval read APIs

Added `references/308-projected-approval-read-api-slice.md`. Observed approval
activity now persists the bounded full approval record, and Host runtime
approval list/detail GET routes merge projected approvals with local
compatibility files.

Direct Host approval mutation remains local-context backed; signed User Node
approval responses remain the federated participant path.

## [2026-04-28] implementation | Added projected turn read APIs

Added `references/309-projected-turn-read-api-slice.md`. Observed runner turn
activity now persists the bounded full turn record, and Host runtime turn
list/detail GET routes merge projected turns with local compatibility files.

This lets remote turn activity observed through signed `turn.updated` events
show up through the same Host API surfaces without requiring Host to read a
runner-local `turns` directory.

## [2026-04-28] implementation | Exercised projected runtime reads in process smoke

Added `references/310-process-smoke-opencode-projection-read-api-slice.md`.
The federated process-runner smoke now injects a temporary deterministic
`opencode` executable into the spawned agent runner, sends a signed User Node
`task.request`, and verifies Host projected turn, approval, and session read
APIs over signed runner observations without requiring live model credentials.

Runner blocked-turn handling now also publishes the final
`waiting_approval` session and `awaiting_approval` conversation observations
after engine approval directives, so Host projection does not depend on runner
filesystem reads for that state transition.

## [2026-04-28] implementation | Completed more runner lifecycle observations

Added `references/311-runner-lifecycle-observation-completeness-slice.md`.
Runner service now publishes session/conversation observations for later
lifecycle transitions after outbound handoff writes, coordination
`task.result` and `conversation.close`, approval request/response handling,
normal completion, cancellation, and failure paths.

This reduces the gap between runner-local lifecycle state and Host projection
for remote deployments where Host cannot inspect `runtimeRoot`.

## [2026-04-28] implementation | Added projected artifact read APIs

Added `references/312-projected-artifact-read-api-slice.md`. Host runtime
artifact list/detail GET routes now merge observed `artifact.ref` projection
records with local compatibility files.

Projected artifact refs can now be listed and inspected for nodes in the active
graph even when Host has no readable runner-local runtime context. Deep preview,
history, diff, restore, and promotion operations remain local-context backed
until object-backend resolution replaces those filesystem reads.

## [2026-04-28] implementation | Added projected source-candidate read APIs

Added `references/313-projected-source-candidate-read-api-slice.md`.
`source_change.ref` observations can now carry the full bounded
`SourceChangeCandidateRecord` owned by the runner.

Host persists that candidate in projection and merges projected candidates with
local compatibility files for runtime source-change candidate list/detail GET
routes. Source diff/file preview, review, apply, and source-history operations
remain local-context backed until those operations move to a runner-mediated or
backend-resolved federated path.

## [2026-04-28] implementation | Added projected artifact preview API

Added `references/314-projected-artifact-preview-api-slice.md`. Runtime
artifact preview GET routes now prefer local same-machine preview files when
available and otherwise fall back to bounded preview content carried by
observed `artifact.ref` projection.

The available preview contract now treats `sourcePath` as optional, so
projection-backed previews do not expose or fabricate runner-local filesystem
paths.

## [2026-04-28] implementation | Added projected source-candidate diff API

Added `references/315-projected-source-candidate-diff-api-slice.md`. Runtime
source-change candidate diff GET routes now prefer local shadow-git diffs when
available and otherwise fall back to bounded `diffExcerpt` evidence carried by
the projected source-change candidate record.

Source file preview, review, apply, and source-history operations remain
local-context backed until those paths move to a federated mutation or
backend-resolved protocol.

## [2026-04-28] verification | Proved projected source candidates in process smoke

Added `references/316-process-smoke-projected-source-candidate-slice.md`. The
deterministic fake OpenCode executable used by the federated process-runner
smoke now writes a source file in the runner-owned source workspace.

The smoke now waits for the projected source-change candidate list/detail/diff
Host APIs and verifies the projected diff for the generated source file, still
without requiring live model credentials.

## [2026-04-28] implementation | Moved Docker join config to inline env

Added `references/317-docker-join-config-env-slice.md`. Runners can now start
join mode from `ENTANGLE_RUNNER_JOIN_CONFIG_JSON`, and the Docker launcher
adapter defaults join-mode managed containers to inline JSON join config
delivery.

The federated dev Compose Host now selects Docker join mode with
`ENTANGLE_DOCKER_RUNNER_HOST_API_URL=http://host:7071`, so managed Docker
runners can fetch portable bootstrap bundles through Host API instead of
mounting Host state just to read `runner-join.json`.

## [2026-04-28] implementation | Added projected source-candidate file previews

Added `references/318-projected-source-candidate-file-preview-slice.md`.
Source-change summaries can now carry bounded changed-file text previews, and
runner source harvesting emits previews for the first changed non-deleted files.

The Host source-change candidate file preview API now prefers local shadow-git
content when present and otherwise falls back to the projected bounded preview,
so basic source review can work without Host-readable runner filesystem state.

## [2026-04-28] implementation | Added projected memory/wiki read APIs

Added `references/319-projected-memory-wiki-read-api-slice.md`. Runtime memory
list/page APIs now prefer local memory files but can fall back to observed
`wiki.ref` projection records with bounded preview content.

Projection-backed memory previews omit local `sourcePath`; this keeps remote
User/Agent node wiki memory inspectable without pretending Host can read the
runner's memory root.

## [2026-04-28] implementation | Stabilized projected artifact history and diff reads

Added `references/320-projected-artifact-history-diff-read-api-slice.md`.
Artifact history/diff APIs now prefer local git materialization but can return
projected artifact records with explicit unavailable history/diff reasons when
Host only has an observed artifact ref.

This removes another local-context read precondition from runtime inspection
without pretending that projection alone can compute full git history.

## [2026-04-28] implementation | Added federated runtime lifecycle control

Added `references/324-federated-runtime-lifecycle-control-slice.md`. The
control protocol now includes `runtime.start` alongside stop/restart, Host
publishes signed lifecycle control commands for accepted/active runtime
assignments, and joined runners apply those commands to runner-local runtime
handles before publishing signed receipts and `runtime.status` observations.

Host runtime synchronization now treats assigned nodes as federated ownership
boundaries and no longer reconciles them through the local Docker/memory
backend adapter. Unassigned nodes still use the local adapter path. The
federated process-runner smoke passed after the change, including runner
filesystem isolation and signed User Node source-change review.

## [2026-04-28] verification | Proved federated lifecycle commands in process smoke

Added `references/325-federated-lifecycle-process-smoke-slice.md`. The
federated process-runner smoke now calls Host runtime stop, start, and restart
routes for the accepted agent assignment, waits for the real joined runner to
apply each command, and verifies projected signed `runtime.status`
observations.

The restart assertion waits for a post-command `lastSeenAt`, so the smoke
cannot pass against stale pre-restart running state.

## [2026-04-28] implementation | Recorded assignment receipts in Host audit

Added `references/326-assignment-receipt-audit-trail-slice.md`. Host now
records signed runner `assignment.receipt` observations as typed
`runtime.assignment.receipt` Host events after validating the registered runner
identity.

The process-runner smoke now verifies `received`, `started`, and `stopped`
receipt events from the real lifecycle command path in addition to runtime
projection state.

## [2026-04-28] implementation | Projected assignment receipts

Added `references/327-assignment-receipt-projection-slice.md`. Host projection
snapshots now include bounded `assignmentReceipts` records derived from typed
receipt events.

This gives operator surfaces a compact read model for recent assignment
received/materialized/started/stopped/failed receipts without scanning the full
Host event stream. The federated process-runner smoke still passes with the
expanded projection schema.

## [2026-04-28] implementation | Surfaced assignment receipts for operators

Added `references/328-assignment-receipt-operator-surfaces-slice.md`. CLI
projection summaries now include the projected assignment receipt count, and
Studio renders a compact recent receipt list beside assignment and runtime
state.

This keeps the signed runner receipt audit trail visible through normal
operator surfaces instead of requiring raw event-log inspection.

## [2026-04-28] implementation | Added per-relay Host transport diagnostics

Added `references/329-per-relay-transport-diagnostics-slice.md`. Host status
now includes per-relay control/observe rows derived from configured relay URLs
and the Host transport plane state.

CLI status detail lines and Studio Host Status now expose those relay rows, so
operators can inspect federated transport configuration without dropping to raw
logs.

## [2026-04-28] implementation | Moved accepted source review application into the runner

Added `references/330-runner-owned-source-history-application-slice.md`. When a
signed User Node `source_change.review` accepts a source candidate, the owning
runner now records source history in runner-owned state if the shadow git
snapshot and source workspace are compatible.

The runner republishes the candidate with `candidate.application`, and the
process-runner smoke now requires that projected source-history application
evidence after User Client source review.

## [2026-04-28] implementation | Preserved User Node runtime projection records

Added `references/338-user-node-runtime-projection-retention-slice.md`. Host
runtime synchronization now keeps observed federated runtime records for active
graph User Nodes, so live Human Interface Runtime/User Client endpoints remain
visible through Host projection after runtime inspection refreshes.

The regression test records a signed User Node `runtime.status` observation
with a `clientUrl`, triggers Host runtime synchronization, and verifies that
projection still reports the User Node runtime as running with the same User
Client URL. The process-runner smoke and adjacent docs now also print
copyable `pnpm --filter ... dev ...` commands without passing a literal `--`
argument to the CLI.

## [2026-04-28] implementation | Added JSON read state to the User Client

Added `references/345-user-client-json-read-state-slice.md`. Human Interface
Runtime now exposes `POST /api/conversations/:conversationId/read` for the
dedicated User Client app.

The route marks the User Node conversation read through Host and reuses the
existing best-effort signed `read.receipt` behavior. The dedicated
`apps/user-client` app now calls that runtime-local JSON route when opening a
thread with unread messages, then refreshes state so projected unread counts
converge without using Studio as the participant client.

## [2026-04-28] implementation | Added runner-owned wiki publication control

Added `references/346-runner-owned-wiki-publication-control-slice.md`.
Explicit wiki repository publication now uses a Host-signed
`runtime.wiki.publish` control command to the accepted runner assignment.

The owning runner syncs its runner-local wiki repository, publishes the
snapshot to the node's primary git target, persists the publication artifact
record in runner-owned state, and emits signed `artifact.ref` evidence for Host
projection. Host, host-client, and CLI request the command without reading or
pushing runner-local wiki files.

## [2026-04-28] implementation | Added Studio wiki publication control

Added `references/347-studio-wiki-publication-control-slice.md`. Studio's
selected-runtime Runtime Memory panel can now request wiki publication through
the same Host-signed `runtime.wiki.publish` command path as CLI.

The UI collects optional reason, requester id, and failed-publication retry
state, then shows the requested command summary while publication completion
remains separate runner observation evidence.

## [2026-04-29] implementation | Added target-aware source-history publication

Added
`references/379-runner-owned-source-history-target-publication-slice.md`.
Host-signed `runtime.source_history.publish` commands can now carry an
approval id and explicit git target selectors. Host, CLI, Studio helpers, the
federated control plane, joined runner command routing, and `RunnerService`
all preserve those fields.

The assigned runner resolves the selected git target from its effective
artifact context, requires scoped `source_publication` approval for
non-primary publication when policy requires it, performs the push from
runner-owned state, and emits the normal projected artifact/source-history
evidence. Focused schema, Host, host-client, runner, Studio, typecheck, and
lint gates passed for the touched scope.

## [2026-04-29] implementation | Added target-aware wiki publication

Added `references/380-runner-owned-wiki-target-publication-slice.md`.
Host-signed `runtime.wiki.publish` commands can now carry the same generic git
target selector used by explicit source-history publication.

Host, CLI, Studio, the federated control plane, joined runner command routing,
and `RunnerService` preserve the selector. The assigned runner resolves the
target from its effective artifact context, publishes the wiki repository from
runner-owned state, preserves the existing primary artifact id shape, and adds
resolved target identity to non-primary wiki publication artifact ids. Focused
schema, Host, host-client, runner, Studio, global typecheck, and global lint
gates passed for the touched scope. The federated process-runner smoke also
passed over the live local relay, including Host-signed wiki publication on the
primary target, two User Node runners, and filesystem isolation.

## [2026-04-29] verification | Added process smoke coverage for targeted wiki publication

Added `references/381-process-smoke-wiki-target-publication-slice.md`. The
process-runner smoke now creates a sibling git repository, sends a second
Host-signed `runtime.wiki.publish` request with `target.repositoryName`, waits
for projected `artifact.ref` evidence for that repository, and verifies the
sibling bare git branch head.

This turns non-primary wiki publication from focused unit/contract coverage
into a process-boundary proof over the live relay and real joined runner path.

## [2026-04-29] implementation | Added multi-target source-history publication

Added `references/382-source-history-multi-target-publication-slice.md`.
Source-history records now retain a `publications` array while preserving
`publication` as the latest compatibility summary.

The runner now checks existing publication metadata per resolved git target,
so automatic primary source-history publication no longer blocks a later
Host-signed non-primary publication command for the same source-history entry.
Non-primary source-history artifacts receive target-qualified ids, and the
process-runner smoke now requests and verifies targeted source-history
publication against a sibling git repository over the live relay and joined
runner path.

## [2026-04-29] implementation | Added source-history publication target presentation

Added `references/383-source-history-publication-presentation-slice.md`.
Shared host-client source-history presentation now exposes retained
per-target publication records, including count, target labels, artifact ids,
branches, approval ids, and publication state.

CLI summaries now include additive `publicationCount`, `publicationTargets`,
and `publishedArtifactIds` fields while preserving latest-publication fields.
Studio source-history detail uses the same shared helper, so visual and
headless surfaces stay aligned.

## [2026-04-29] implementation | Added runner-owned artifact restore control

Added `references/384-runner-owned-artifact-restore-control-slice.md`.
Artifact restore now uses a Host-signed `runtime.artifact.restore` control
command to the accepted runner assignment instead of a Host-side filesystem
mutation.

The assigned runner retrieves the projected artifact ref through runner-owned
artifact backend state, persists success or failure retrieval records, and
emits signed `artifact.ref` observation evidence that Host projection can
inspect without reading runner-local files.

## [2026-04-29] implementation | Surfaced artifact restore for operators

Added `references/385-artifact-restore-operator-surfaces-slice.md`. CLI now
exposes `host runtimes artifact-restore` with compact summary output, and
Studio exposes the same Host request from selected artifact detail.

Both surfaces request the existing Host-signed runner control path and show a
request acknowledgement while restore completion remains runner observation
evidence.

## [2026-04-29] verification | Added process smoke coverage for artifact restore

Added `references/386-process-smoke-artifact-restore-slice.md`. The
process-runner smoke now requests runner-owned artifact restore for the real
source-history artifact published by the joined agent runner, then waits for
Host projection to report runner-observed `retrieved` state.

The smoke exposed and closed a validator mismatch for file-backed git proof
profiles: file git targets no longer require git transport principals, while
SSH and HTTPS git targets still keep the existing principal requirements.

## [2026-04-29] implementation | Added runner-owned artifact source proposals

Added `references/387-runner-owned-artifact-source-proposal-slice.md`.
Artifact-to-source work now uses a Host-signed
`runtime.artifact.propose_source_change` command instead of Host-side
promotion.

The assigned runner retrieves the artifact, copies bounded safe content into
its source workspace, harvests a `pending_review` source-change candidate, and
emits signed `source_change.ref` evidence. The process-runner smoke now proves
that path against the real report artifact published by the joined agent
runner.

## [2026-04-29] implementation | Surfaced artifact source proposals for operators

Added `references/388-artifact-source-proposal-operator-surfaces-slice.md`.
CLI now exposes `host runtimes artifact-source-proposal` with compact summary
output, and Studio exposes the same Host request from selected artifact
detail.

Both surfaces request the existing Host-signed runner control path and show a
request acknowledgement while the resulting pending source-change candidate
remains runner observation evidence.

## [2026-04-29] implementation | Added User Client artifact source proposals

Added `references/389-user-client-artifact-source-proposal-slice.md`.
The Human Interface Runtime now exposes a conversation-scoped
`POST /api/artifacts/source-change-proposal` route and matching fallback HTML
form for artifacts visible to the selected User Node conversation.

The dedicated User Client can request source-change proposals from visible
artifact cards with target path, reason, and overwrite controls. The runtime
forwards the request through the existing Host-signed runner control path and
sets `requestedBy` to the User Node id.

## [2026-04-29] implementation | Correlated artifact proposal acknowledgements

Added `references/390-artifact-proposal-correlation-slice.md`. Host now
generates an effective artifact proposal id when the caller omits one, sends
that id in the `runtime.artifact.propose_source_change` control payload, and
returns it in the request acknowledgement.

This makes CLI, Studio, and User Client proposal acknowledgements immediately
actionable: the returned `proposalId` is the source-change candidate id the
runner is expected to create and project.

## [2026-04-29] implementation | Added runtime command receipt projection

Added `references/391-runtime-command-receipt-projection-slice.md`.
`entangle.observe.v1` now includes signed `runtime.command.receipt`
observations, Host records them as typed `runtime.command.receipt` audit
events, and Host projection exposes bounded `runtimeCommandReceipts`.

Joined runners now emit received/completed/failed command receipts for
`runtime.artifact.propose_source_change`, correlating the Host command id,
effective proposal id, and resulting source-change candidate id. The
process-runner smoke now waits for that completed receipt after verifying the
projected candidate.

## [2026-04-29] implementation | Extended command receipts to runner-owned work commands

Added `references/392-runner-owned-command-receipt-adoption-slice.md`.
Joined runners now emit received/completed/failed `runtime.command.receipt`
observations for artifact restore, source-history publication,
source-history replay, and wiki publication commands.

The process-runner smoke now verifies completed command receipts for artifact
restore, targeted source-history publication, and wiki publication in addition
to the existing artifact/source/wiki domain evidence.

## [2026-04-29] implementation | Added lifecycle and session command receipts

Added `references/393-lifecycle-session-command-receipts-slice.md`.
Lifecycle start/stop/restart and session cancellation now emit
received/completed/failed `runtime.command.receipt` observations while keeping
assignment receipts, runtime status, and session observations as the domain
evidence.

The process-runner smoke now verifies completed lifecycle command receipts for
stop/start/restart through Host projection.

## [2026-04-29] implementation | Added command receipts to assignment timelines

Added `references/394-assignment-command-receipt-timeline-slice.md`.
Assignment timeline responses now include assignment-scoped
`runtime.command.receipt` projection records and timeline entries alongside
assignment lifecycle entries and runner assignment receipts.

CLI compact assignment timeline output now reports command receipt counts and
command receipt metadata. The process-runner smoke now verifies completed
runtime command receipt evidence through the assignment timeline read model.

## [2026-04-29] implementation | Added Studio command receipt visibility

Added `references/395-studio-command-receipt-operator-visibility-slice.md`.
Studio Federation now renders runtime command receipt counts, per-assignment
command receipt summaries, and recent command receipt rows directly from Host
projection.

This keeps operator visibility aligned with the assignment timeline and CLI
work without adding direct runner calls or a separate Studio-owned command
receipt model.

## [2026-04-29] implementation | Added empty projected memory read model

Added `references/396-projection-empty-memory-read-model-slice.md`.
Runtime memory inspection now returns an empty `projection://<nodeId>/wiki-refs`
view for active graph nodes that have no Host-readable runtime context and no
projected wiki refs yet.

This keeps `/v1/runtimes/:nodeId/memory` federated-friendly while leaving
`/v1/runtimes/:nodeId/context` and runtime inspection responsible for reporting
context materialization failures.

## [2026-04-29] implementation | Added CLI projection command receipt summaries

Added `references/397-cli-projection-command-receipt-summary-slice.md`.
`entangle host projection --summary` now includes up to six recent runtime
command receipts in addition to the total command receipt count.

This gives headless operators the same immediate command-closure visibility
that Studio now shows from Host projection.

## [2026-04-29] implementation | Added CLI command receipt inspection

Added `references/398-cli-command-receipt-list-slice.md`.
`entangle host command-receipts` now lists projected runtime command receipts
directly from Host projection, with filters for assignment id, node id, runner
id, runtime command event type, receipt status, and result limit.

This keeps command-closure inspection headless-friendly without adding a direct
runner call or a new Host API surface.

## [2026-04-29] implementation | Added Studio assignment timeline drilldown

Added `references/399-studio-assignment-timeline-drilldown-slice.md`.
Studio Federation assignment rows now include a read-only `Timeline` action
that fetches `GET /v1/assignments/{assignmentId}/timeline` through the shared
host client and renders assignment lifecycle, assignment receipt, and runtime
command receipt entries together.

This brings Studio's operator drilldown closer to CLI parity while keeping the
surface Host-boundary-only and runner-filesystem-free.

## [2026-04-29] implementation | Added artifact backend cache target pruning

Added `references/409-artifact-backend-cache-target-policy-slice.md`. Host
artifact backend cache clear requests now accept git service, namespace, and
repository selectors, with namespace/repository validation tied to the service
selector. Host applies clear, age, and max-size policies only to matched
derived cache repositories, responses report `matchedRepositoryCount`, shared
summaries include target scope, and CLI exposes `--git-service`, `--namespace`,
and `--repository`.

## [2026-04-29] implementation | Added distributed proof verifier

Added `references/408-distributed-proof-verifier-slice.md` and
`pnpm ops:distributed-proof-verify`. The verifier polls Host status, runner
registry, assignments, and projection through HTTP APIs, optionally checks User
Client `/health`, and can require primary User Node conversation projection.
It includes a self-test fixture and does not read Host or runner files.

## [2026-04-29] implementation | Added distributed proof kit generator

Added `references/407-distributed-proof-kit-slice.md` and
`pnpm ops:distributed-proof-kit`. The command prepares a copyable
three-runner proof kit for a reachable Host/relay/git topology by generating
Host-derived runner join configs, runner-local env/start scripts, and operator
trust/assignment/User Node message commands. Host tokens are written only when
`--write-host-token` is explicit, and the generated runner path continues to
use generic `entangle-runner join` without Host filesystem access.

## [2026-04-29] implementation | Added artifact backend cache size pruning

Added `references/406-artifact-backend-cache-size-policy-slice.md`. Host
artifact backend cache clear requests now accept `maxSizeBytes`, apply age
pruning first when present, then prune oldest retained derived repositories
until the retained cache is at or below the requested size. Host responses and
shared summaries now report retained bytes, and CLI exposes
`entangle host artifact-backend-cache-clear --max-size-bytes <n>` while keeping
the operation limited to rebuildable Host-owned cache state.

## [2026-04-29] implementation | Added artifact backend cache age pruning

Added `references/400-artifact-backend-cache-prune-policy-slice.md`.
Artifact backend cache clear requests now accept `olderThanSeconds`, and Host
selects only derived cache repository directories older than that threshold
while preserving dry-run behavior.

CLI exposes the same policy through
`entangle host artifact-backend-cache-clear --older-than-seconds <n>`, and
shared summaries report selected and retained repository counts without
exposing Host filesystem paths.

## [2026-04-29] implementation | Made the root test gate reliable

Added `references/401-root-test-gate-reliability-slice.md`. Root `pnpm test`
now runs package test commands directly in a fixed sequence instead of routing
through Turbo, because Turbo left Vitest child processes open in this
environment while the same package tests exited cleanly when run directly.

CLI, Studio, and User Client package test scripts now use Vitest fork pools.
The root `pnpm test` gate, targeted package tests, product naming check, and
diff/local-assumption audits passed for this slice.

## [2026-04-29] implementation | Added the interactive User Node runtime demo

Added `references/402-user-node-runtime-demo-command-slice.md`.
`pnpm ops:demo-user-node-runtime` now builds the dedicated User Client app,
starts the development relay, and runs the federated process-runner smoke in
`--keep-running` mode.

This gives operators one no-credential command for opening the running User
Client endpoints served by actual User Node runtimes while preserving the
existing Host/runner/User Node filesystem isolation and Nostr control path.

## [2026-04-29] implementation | Added Studio runner trust controls

Added `references/403-studio-runner-trust-controls-slice.md`. Studio's
Federation panel now includes a Runner Registry block with projected runner
rows plus Trust/Revoke actions wired through the shared Host client.

This lets the visual admin surface admit or revoke runners through the same
Host runner registry boundary already used by the CLI, without creating a
Studio-owned runner registry model.

## [2026-04-29] implementation | Added Studio runner registry detail

Added `references/404-studio-runner-registry-detail-slice.md`. Studio now joins
projected runner rows with the full Host runner registry read model when
available, adding liveness, heartbeat last-seen, runtime kind, engine kind, and
capacity summaries to the Federation panel.

The projection remains the control summary, while registry detail stays a
Host-owned read surface used for operator decision support.

## [2026-04-29] implementation | Added Studio assignment operational detail

Added `references/405-studio-assignment-operational-detail-slice.md`. Studio
assignment timeline drilldowns now include compact operational detail for the
selected assignment: runtime observed/desired state, runner liveness and
heartbeat, source-history count, replay count, and command receipt count.

This keeps assignment drilldown useful as an admin surface while still joining
only Host projection and runner-registry read models at render time.

## [2026-04-29] implementation | Added Host bootstrap security status

Added `references/410-bootstrap-operator-security-status-slice.md`. Host
status now includes a required `security` object that reports tokenless mode or
the active bootstrap operator-token posture with normalized operator id and
role, without exposing bearer-token material.

Shared host-client formatting, CLI host status projection, and Studio's Host
Status panel now render that security posture. This keeps the current
bootstrap auth/audit boundary operator-visible while leaving real
multi-principal authorization as a separate production hardening track.

## [2026-04-29] implementation | Hardened chained Vitest fork pools

Followed up `references/401-root-test-gate-reliability-slice.md` after the
root sequential test gate reproduced the same no-output Vitest child-process
hang on additional workspace packages. Root `pnpm test` now runs
`scripts/run-workspace-tests.mjs`, which invokes package-directory tests
sequentially with inherited stdio, timeouts, and process-group cleanup instead
of relying on a long shell chain of `pnpm --filter` commands.
`package-scaffold` and `host-client` now use fork pools, joining the existing
CLI/Studio/User Client fork-pool scripts, and CLI is pinned to one worker after
parallel forks hung at the end of the chain. Other Node packages remain on the
default pool because that is their stable configuration in this environment.

## [2026-04-29] implementation | Added distributed proof tool CI smoke

Added `references/411-distributed-proof-tool-ci-smoke-slice.md` and
`pnpm ops:smoke-distributed-proof-tools`. The smoke checks proof-kit and
verifier syntax, help output, token/no-token proof-kit dry-runs, and verifier
self-test JSON with User Client health and required-conversation checks
enabled.

This makes the distributed proof tooling CI-checkable without live model
credentials or external machines. It does not replace the real proof where
runners, Host, relay, and git backend live on separate reachable boundaries.

## [2026-04-29] implementation | Added User Client wiki publication requests

Added `references/412-user-client-wiki-publication-slice.md`. The Human
Interface Runtime now exposes a conversation-scoped
`POST /api/wiki-repository/publish` route that requires a visible inbound
wiki approval/resource before forwarding Host's `runtime.wiki.publish` request
with `requestedBy` set to the User Node id.

The dedicated User Client now exposes that action from wiki cards with reason
and retry controls, keeping Studio as the admin surface and the User Client as
the human graph participant surface.

## [2026-04-29] tooling | Returned validator tests to default Vitest pool

During the User Client wiki publication slice, root `pnpm test` timed out at
`@entangle/validator` and then at `@entangle/package-scaffold` while those
package scripts used `--pool=forks`; `host-client` was checked before waiting
for the same failure. Host then reproduced a no-output direct package-test
hang under its default pool while passing immediately under `--pool=threads`.
The smaller package suites passed immediately under the default Vitest pool and
under `--pool=threads`, so `packages/validator/package.json`,
`packages/package-scaffold/package.json`, and
`packages/host-client/package.json` now use the default pool again,
`services/host/package.json` uses the threads pool, and
`references/401-root-test-gate-reliability-slice.md` records the correction.

## [2026-04-29] implementation | Proved User Client wiki publication in process smoke

Added `references/413-user-client-wiki-publication-process-smoke-slice.md`.
The federated process-runner smoke now publishes a signed builder-originated
wiki approval request to the User Node, waits for that inbox record, calls the
running User Client's `/api/wiki-repository/publish` route, and waits for the
completed projected `runtime.wiki.publish` command receipt.

The same verification pass pinned Host package tests to the Vitest threads pool
because the direct package command reproduced a no-output hang under the
default pool while passing immediately with threads. Runner package tests were
then pinned to the threads pool for the same root-gate reason after default
pool execution hung while threads and forks both passed.

## [2026-04-29] implementation | Added User Client artifact restore requests

Added `references/414-user-client-artifact-restore-slice.md`. The Human
Interface Runtime now exposes a conversation-scoped
`POST /api/artifacts/restore` route for artifacts visible in the selected User
Node conversation, forwarding Host artifact restore control with `requestedBy`
set to the User Node id.

The dedicated User Client now exposes restore controls on artifact cards, and
the federated process-runner smoke calls the running User Client restore route
for a visible source-history artifact before waiting for the completed
projected `runtime.artifact.restore` command receipt.

## [2026-04-29] implementation | Added User Client source-history publication requests

Added `references/415-user-client-source-history-publication-slice.md`. The
Human Interface Runtime now exposes a conversation-scoped
`POST /api/source-history/publish` route for visible source-history resources,
checks matching projected `sourceHistoryRefs`, and forwards Host source-history
publication control with `requestedBy` set to the User Node id.

The dedicated User Client now renders source-history publication controls for
visible source-history approval resources. The process-runner smoke publishes a
signed builder source-history approval request to the User Node, calls the
running User Client publication route, and waits for the completed projected
`runtime.source_history.publish` command receipt.

## [2026-04-29] tooling | Added root test wrapper suite drain

While verifying the source-history User Client slice, the sequential root test
gate reproduced no-output hangs on different workspace packages even though
the same `pnpm --dir <workspace> test` commands passed directly. The root
`scripts/run-workspace-tests.mjs` wrapper now uses non-detached package
commands and waits one second between suites, matching the delayed direct
sequence that passed end to end in this environment.

## [2026-04-29] implementation | Tightened User Client source-history targets

Added `references/416-user-client-source-history-target-visibility-slice.md`.
User Client source-history publication requests that include a git target now
require a matching visible `source_history_publication` resource in the
selected User Node conversation. The fallback Human Interface Runtime page and
the dedicated User Client both carry the target encoded by that resource.

This keeps participant-triggered target publication scoped to graph-visible
conversation evidence while leaving operator Host surfaces able to request
explicit targets directly.

During root verification for this slice, User Client reproduced the root
wrapper no-output hang under Vitest forks while the same suite passed
immediately under threads. The User Client package test script now uses the
threads pool, matching the stable Host/Runner configuration.

## [2026-04-29] tooling | Removed nested pnpm from the root test gate

During the User Client wiki target slice, root `pnpm test` again reproduced
no-output hangs while repeatedly spawning nested `pnpm` commands, even though
the same workspace tests passed directly. `scripts/run-workspace-tests.mjs`
now launches the local Vitest binary directly, expands `src/**/*.test.ts`
files itself for each suite, and keeps the explicit sequential ordering and
timeouts. The root `pnpm test` gate now passes through all workspace suites
without relying on shell globbing, nested `pnpm`, or implicit Vitest discovery.

## [2026-04-29] implementation | Tightened User Client wiki targets

Added `references/417-user-client-wiki-target-visibility-slice.md`. User
Client wiki publication requests that include a git target now require a
matching visible `wiki_repository_publication` resource in the selected User
Node conversation before the Human Interface Runtime forwards
`runtime.wiki.publish` to Host.

The dedicated User Client derives and displays that target from the visible
approval resource, and the federated process-runner smoke now sends a
target-specific builder wiki approval request before asking the running User
Client to request publication. Target-qualified wiki publication artifact ids
now use bounded digest suffixes when repository names would exceed the shared
artifact id schema limit.

## [2026-04-29] test | Proved User Client wiki target git handoff

Added `references/418-user-client-wiki-target-process-proof-slice.md`. The
federated process-runner smoke now verifies that the User Client
target-specific wiki publication path produces a projected git
`knowledge_summary` artifact for the requested repository and that the target
bare repository's `builder/wiki-repository` branch head matches the projected
commit.

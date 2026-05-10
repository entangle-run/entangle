# Entangle Wiki Overview

## What this wiki is for

This wiki is the project memory for Entangle.

It is not a personal notebook and not a generic documentation dump. It should track:

- what Entangle is;
- what has been decided;
- why it was decided;
- what remains unresolved;
- which external systems matter;
- which references should shape implementation.

## Current project state

Entangle is currently in a partial end-to-end runtime implementation phase.

The corpus now extends from conceptual architecture into normative contracts,
package and binding structure, edge semantics, artifact backends, control-plane
rules, compatibility policy, observability, Studio responsibilities, host API
contracts, effective runtime context, engine-adapter boundaries, and a concrete
same-machine deployment profile.

The local reference corpus is materialized under `resources/`, and the
implementation stack direction has now been narrowed toward a canonical
TypeScript + Node 22 + pnpm + Turborepo toolchain around `nostr-tools`,
`strfry`, `Gitea`, Docker Compose, `entangle-host`, and host-managed runners.

The previously remaining pre-implementation decisions have now also been
closed:

- the node execution core should live in a first-party internal
  `agent-engine` package rather than inside a wholesale upstream runtime fork;
- live local host state should live under a disciplined `.entangle/` runtime
  root with explicit desired, observed, trace, import, and workspace
  partitions;
- the early same-machine profile should include a thin but real CLI plus package
  scaffolding, while Studio remains the richer operator surface.

The repository is therefore no longer best described as "entering
implementation" or as being in a control-plane-only stage.

As of the 2026-04-26 federated-runtime pivot audit, the forward-looking product
baseline is Entangle. Same-machine deployment is the first deployment topology,
not the product identity or a separate runtime profile. The current
implementation still has same-workstation adapter and deep-detail migration
work: Host writes injected runtime context for launcher compatibility, Docker
runners can still share Host-managed volumes, and some Host runtime detail APIs
still read runner-owned state. The active redesign pack under
`references/221-federated-runtime-redesign-index.md` defines the required shift
to Host Authority signing, generic runner registration, runtime assignments,
signed observations, stable User Node identities, and projection-backed
Studio/CLI surfaces.

The most accurate current description is:

- the architecture and contract layers are strong and largely stable;
- the host, runner, generic join path, assignment path, Human Interface
  Runtime, and User Client are already real runtime components;
- browser-based Studio development can now call Host across the default
  development ports through an explicit Host CORS allow-list, and the
  keep-running User Node runtime demo prints a Studio startup command with the
  live Host URL and operator token;
- the process-runner smoke now proves joined agent and User Node runners over a
  live relay with signed messages, signed approvals, projected heartbeats, and
  separate Host/runner state roots, and it now validates the per-assignment
  timeline read model over real runner acceptance and lifecycle receipt
  evidence;
- Host activity projection now preserves runner-signed observation-event
  records during local compatibility synchronization, and the high-level
  session list plus bounded session detail can surface remote projected
  sessions without a Host-readable runner filesystem record;
- approval lifecycle changes now flow through signed runner
  `approval.updated` observations into Host approval activity projection, and
  approval list/detail read APIs can use that projection without runner-local
  approval files;
- runner turn list/detail read APIs can now use observed `turn.updated`
  projection without runner-local turn files;
- runtime artifact list/detail read APIs can now use observed `artifact.ref`
  projection without runner-local artifact files;
- runtime artifact preview read APIs can now use bounded projected
  `artifact.ref` preview content without exposing runner-local source paths;
- source-change candidate list/detail read APIs can now use full candidate
  records carried by observed `source_change.ref` projection without
  runner-local candidate files;
- source-change candidate diff read APIs can now fall back to projected
  `diffExcerpt` evidence without runner-local shadow git state;
- source-change candidate file preview read APIs can now fall back to bounded
  projected text previews from observed source-change summaries;
- runtime memory list/page read APIs can now fall back to observed `wiki.ref`
  projection records and bounded wiki previews when Host cannot read the
  runner's memory root, and memory list now returns an empty projection-backed
  view for active graph nodes before any wiki refs are observed;
- artifact history/diff read APIs can now resolve projected git artifact
  locators through a Host-owned backend cache when semantic artifact context
  identifies a reachable git backend, and otherwise return projected artifact
  records with explicit unavailable reasons;
- the running User Client can now request bounded artifact history/diff
  evidence through its Human Interface Runtime and Host artifact read APIs when
  the artifact ref is visible in the selected User Node conversation;
- the process-runner smoke now verifies backend-cache history/diff for a
  runner-published source-history git artifact and verifies the same
  visible-artifact history/diff path through the running User Client;
- the process-runner smoke now requests runner-owned artifact restore for that
  source-history artifact and verifies projected `retrieved` evidence from the
  real joined runner path, while file-backed git proof targets no longer
  require transport principals;
- artifact-to-source work now returns as runner-owned source-change proposal
  behavior: Host signs `runtime.artifact.propose_source_change`, the assigned
  runner retrieves the artifact, copies bounded safe content into its source
  workspace, emits a `pending_review` source-change candidate, and the
  process-runner smoke verifies that path against the real runner-published
  report artifact;
- the process-runner smoke now exercises the OpenCode adapter with a temporary
  deterministic `opencode` executable inside the spawned agent runner, mutates
  the source workspace, then verifies projected turn, source-change candidate
  list/detail/diff/file, running User Client source-change diff/file preview,
  signed source-candidate review, runner-owned
  source-history application, approval, and session read APIs without live model
  credentials;
- the package-level OpenAI-compatible agent-engine adapter now has a
  deterministic local HTTP provider fixture covering the real `fetch` path for
  chat completion, tool-loop continuation, and rate-limit classification
  without live provider credentials;
- operators can now start a deterministic OpenAI-compatible development
  provider with `pnpm ops:fake-openai-provider` for manual no-credential
  catalog, auth, adapter, and UI wiring tests, including optional scripted
  non-streaming chat-completions and Responses API scenarios;
- `pnpm ops:smoke-fake-openai-provider` now verifies that no-credential
  provider harness end to end, including an opt-in chat-completions tool-call
  round, streaming chat-completions, Responses API frames, and a scripted
  multi-step provider sequence with deterministic HTTP error responses;
- operators can now start a deterministic fake OpenCode server with
  `pnpm ops:fake-opencode-server` for manual no-credential attached-server
  route and permission-bridge plumbing tests;
- `pnpm ops:smoke-fake-opencode-server` now verifies that fake OpenCode
  harness end to end, including Basic-authenticated health, session creation,
  SSE permission delivery, permission reply, deterministic assistant output,
  optional workspace mutation through `x-opencode-directory`, permission
  rejection, session-error delivery, and idle status;
- `pnpm ops:smoke-federated-process-runner -- --use-fake-opencode-server` now
  proves the attached `opencode_server` profile path through the real joined
  runner, including User Node-signed OpenCode permission approvals, source
  workspace mutation, and attached-server session continuity without live model
  credentials;
- the attached OpenCode permission bridge now cancels cleanly while waiting
  for Entangle approval callbacks, preventing a cancelled node turn from
  staying stuck on a stale permission wait;
- the same attached fake OpenCode proof now has shorter root commands:
  `pnpm ops:smoke-federated-process-runner:fake-opencode` for the
  non-interactive smoke and `pnpm ops:demo-user-node-runtime:fake-opencode`
  for the keep-running User Node runtime demo;
- CLI can now upsert active catalog agent engine profiles with
  `host catalog agent-engine upsert`, so operators can configure an attached
  OpenCode or fake OpenCode profile, make it default, and assign it to graph
  nodes without manual catalog JSON editing;
- focused `host catalog agent-engine list|get` commands now inspect active
  catalog engine profiles with deterministic ordering and default-aware compact
  summaries;
- Studio's graph editor now renders active catalog agent engine profiles with
  default marker and compact kind, scope, permission, endpoint/executable,
  default-agent, and version details before node assignment editing;
- the same Studio panel can now create or update catalog agent engine profiles
  through Host's focused profile upsert route, including attached OpenCode base
  URLs and default-profile selection;
- joined agent runners can now execute `external_process` profiles through a
  minimal JSON stdin/stdout adapter, letting custom node engines use the shared
  turn contract while Entangle still owns graph identity, policy, projection,
  and artifacts; shared catalog validation requires those profiles to declare
  an executable;
- joined agent runners can now execute `external_http` profiles through a
  minimal JSON HTTP adapter that POSTs the same turn payload to the configured
  endpoint and validates the shared turn result response;
- operators can now start a deterministic fake external HTTP agent-engine
  endpoint with `pnpm ops:fake-agent-engine-http`, and
  `pnpm ops:smoke-fake-agent-engine-http` verifies no-real-model health,
  bearer rejection before auth, authenticated turn response, optional
  workspace mutation, and debug-state plumbing for `external_http` profiles;
- `pnpm ops:smoke-federated-process-runner:fake-external-http` now runs the
  same fake endpoint through the full joined-runner proof, including Host
  engine profile selection, `external_http` runner capability, User Node review
  and approval, projected source-history/artifact/wiki evidence, and the
  two-User-Node Human Interface Runtime path;
- active agent engine kinds now expose only runner-executable options:
  `opencode_server`, `external_process`, and `external_http`; native Claude
  support should be reintroduced only with a real runner adapter, while
  Claude-based tools can be wrapped through the generic adapters today;
- CLI uses the same focused Host profile upsert route for real
  `host catalog agent-engine upsert` mutations, while dry-run prints the
  request payload before mutation;
- `pnpm ops:check-product-naming` now verifies active product surfaces do not
  reintroduce obsolete local product/profile labels;
- accepted source-candidate reviews now also emit signed `source_history.ref`
  observations, so Host can project source-history records and serve
  source-history list/detail reads without a Host-readable runner filesystem;
- when source publication policy allows it, the runner publishes accepted
  source-history records as git commit artifacts and emits projected
  artifact/source-history observations for that publication, defaulting to the
  primary git target for automatic publication while explicit publish commands
  can select a policy-gated non-primary git target; a source-history entry now
  retains per-target publication records while preserving the latest
  publication summary for existing read paths, and shared CLI/Studio
  presentation exposes publication count, target labels, and artifact ids;
- explicit source-history publication/retry and source-history replay are now
  Host-signed control commands to the accepted runner assignment, with the
  runner owning git publication or replay execution and emitting observation
  evidence; source-history publication commands can carry an approval id and
  explicit git target selectors for non-primary repositories, and the
  process-runner smoke now verifies targeted source-history publication over
  the same live relay and joined runner path; Host now projects
  `source_history.replayed` outcomes into typed replay records for API, CLI,
  and Studio inspection without runner-local file access;
- explicit source-history reconcile is now a sibling Host-signed
  `runtime.source_history.reconcile` command for diverged but cleanly
  mergeable source workspaces; the runner applies the same
  `source_application` approval checks as replay, uses Git three-way tree
  merge against the recorded base/current/head trees, records clean outcomes
  as `merged` replay records with `mergedTree`, and still emits projection
  evidence instead of letting Host mutate source files;
- explicit wiki repository publication is now a Host-signed
  `runtime.wiki.publish` control command to the accepted runner assignment; the
  runner syncs and publishes its wiki repository from runner-owned state to the
  primary git target by default or to an explicit resolved git target selector
  and emits `artifact.ref` evidence, while CLI and Studio request the same Host
  control path; the process-runner smoke now verifies both primary and
  non-primary wiki target publication over the live relay and joined runner
  path;
- runner-owned wiki page replacement/append is now a Host-signed
  `runtime.wiki.upsert_page` control command to the accepted runner
  assignment; the runner validates markdown page paths inside its own
  `memory/wiki` root, writes the page, updates the wiki index, synchronizes the
  wiki repository, emits `wiki.ref` evidence, and reports command receipts
  correlated by `wikiPagePath`, with Host API, host-client, and CLI request
  support;
- the running User Client can now request that same wiki page replacement or
  append path for visible `wiki_page` resources in the selected User Node
  conversation, with the Human Interface Runtime forwarding through Host as
  the User Node and the process-runner smoke validating receipt plus page
  `wiki.ref` evidence;
- Studio's Runtime Memory panel now exposes the same runner-owned wiki page
  upsert command for operators through Host and host-client;
- wiki page upsert now accepts optional `expectedCurrentSha256`; Host carries
  it in the signed control payload, the runner rejects stale base hashes before
  writing, and command receipts can project expected, previous, and next page
  hashes for operator/User Client audit;
- wiki page upsert now also accepts `mode: "patch"` for single-page unified
  diffs; the runner applies the patch only when context and removal lines match
  current runner-owned page content;
- operators can now send bounded multi-page wiki maintenance manifests through
  Host API, host-client, and CLI; Host emits one existing signed
  `runtime.wiki.upsert_page` command per page to the accepted runner
  assignment, so this is a non-atomic batch request rather than a new runner
  transaction protocol;
- operators can now also send a signed `runtime.wiki.patch_set` command for
  related multi-page wiki updates; the runner validates every page before
  writing, rejects stale or invalid sets without partial page mutation, syncs
  the wiki repository once, and projects page-count receipts plus per-page
  `wiki.ref` evidence;
- the running User Client can now request visible wiki page patch-sets through
  its Human Interface Runtime JSON API, with every page checked against the
  selected User Node conversation and `requestedBy` set to the stable User Node
  id before Host publishes the runner-owned command;
- the process-runner smoke now proves the running User Client patch-set path
  through Host signed control delivery, completed runner receipt projection,
  and updated projected wiki preview content;
- the React User Client now exposes visible wiki patch-set requests from the
  wiki resource panel through a queued page draft list and request action;
- deterministic task memory now preserves bounded source-change candidate ids,
  status, totals, diff availability, and changed-file summaries from the live
  turn record, and recent-work memory surfaces that code-change context;
- post-turn memory maintenance now rebuilds a deterministic
  `memory/wiki/summaries/source-change-ledger.md` from source-change-bearing
  task pages and feeds that page into future memory refs plus bounded memory
  briefs;
- post-turn memory maintenance now also rebuilds a deterministic
  `memory/wiki/summaries/approval-ledger.md` from approval-request-bearing task
  pages and feeds that page into future memory refs plus bounded memory briefs;
- the process-runner smoke now proves that patch mode through the running
  User Client JSON API, including expected-base hash forwarding, completed
  command receipt projection, and projected patched wiki preview content;
- the running User Client can now load a complete projected wiki preview into
  its page-update form as a replacement draft, so participant wiki memory edits
  start from visible Host projection without exposing runner-local paths;
- failed stale-edit wiki page receipts now render as explicit User Client
  conflict summaries using projected expected/current hashes;
- CLI summary output exposes the same structured `wikiConflict` object for
  global projection and User Node command receipt summaries;
- the Human Interface Runtime fallback HTML client renders the same conflict
  block inside participant command receipt cards;
- the React User Client can now convert stale wiki editor content into a
  runner-compatible patch draft against the current projected page from the
  conflict block, with the current page hash installed as the next guard;
- the Human Interface Runtime fallback HTML client now exposes visible wiki
  page update and single-page patch-set forms over the same participant-scoped
  Host control path as the React User Client;
- joined runners now publish session/conversation observations for later
  lifecycle transitions after handoffs, coordination result/close, approval
  request/response, completion, cancellation, and failure paths;
- assignment timelines now join Host assignment lifecycle state with projected
  runner receipts and assignment-scoped runtime command receipts, so Host API,
  CLI, and Studio can inspect grouped assignment progress, including recent
  command receipt rows in Studio, compact CLI projection output, and a
  dedicated CLI command receipt list with assignment, node, runner, command
  type, status, requester, and limit filters, plus a Studio assignment timeline
  drilldown over the same Host endpoint with related navigation to runtime,
  runner, source-history, and command receipt panels, without scanning generic
  events or reading runner-local state;
- artifact source-change proposal requests are now exposed through CLI and
  Studio artifact inspection surfaces, using the same Host-signed runner
  control path while completion returns as both projected source-change
  candidate evidence and an explicit signed runtime command receipt;
- the running User Client can now request that same proposal path for artifacts
  visible in the selected User Node conversation, with the Human Interface
  Runtime enforcing visibility and tagging the request as the User Node;
- the running User Client can now request runner-owned wiki publication for
  wiki resources visible in the selected User Node conversation, with the Human
  Interface Runtime enforcing visibility and tagging the request as the User
  Node; target-specific requests must match a visible
  `wiki_repository_publication` resource in that conversation;
- the headless `entangle inbox list` participant surface now supports
  `--unread-only`, `--peer-node <nodeId>`, and `--limit <n>`, returning bounded
  conversation lists with `returned` and `totalMatched` counts without mutating
  Host or runner state;
- the headless `entangle inbox show` participant surface now supports
  `--direction <inbound|outbound>`, `--message-type <type>`, and `--limit <n>`,
  returning bounded recorded-message lists with `returned` and `totalMatched`
  counts over Host-recorded User Node conversation detail;
- the headless `entangle inbox approvals` participant surface now lists inbound
  `approval.request` messages across projected User Node conversations, with
  compact approval id, operation, and resource metadata for signed
  `approve/reject --from-message` responses;
- the headless `entangle inbox source-reviews` participant surface now narrows
  that same recorded-message substrate to approval requests whose resource kind
  is `source_change_candidate`, matching signed
  `review-source-candidate --from-message` decisions;
- the headless `entangle user-nodes assignments <nodeId>` operator surface now
  lists all or only current assignments for one human participant, giving
  reassignment a focused read-only inspection step before mutation;
- the headless `entangle user-nodes runner-candidates <nodeId>` operator
  surface now lists health-aware `human_interface` runner candidates with
  trust, liveness, operational state, current placement, capacity after
  explicit User Node revocation, and exclusion reasons before reassignment;
- Studio User Node runtime rows now render the same runner-candidate reasoning
  and can prepare the existing Host assignment form with a recommended runner
  without mutating assignment state directly from the row;
- the running React User Client now renders a grouped participant Review Queue
  from projected pending approval ids and pending source-change refs, with
  conversation navigation when projection context is available;
- the Human Interface Runtime fallback HTML client now renders the same grouped
  Review Queue, including pending source-change rows from projection state and
  conversation links when context can be inferred;
- the React User Client and fallback Workload panels now also show one total
  pending review count derived from the same Review Queue model;
- the process-runner smoke now proves that User Client wiki publication path
  through a signed builder wiki approval request, the running User Client JSON
  route, a completed projected `runtime.wiki.publish` command receipt, a
  target-specific projected git artifact, and the requested git repository
  branch head;
- the running User Client can now request runner-owned source-history
  publication for visible source-history resources in the selected User Node
  conversation, and the process-runner smoke proves that participant path
  through a completed projected `runtime.source_history.publish` command
  receipt; target-specific publication requests must match a visible
  `source_history_publication` resource in that conversation;
- the running User Client can now request runner-owned source-history
  reconcile for visible plain `source_history` resources in the selected User
  Node conversation, forwarding `approvalId` when present, and the
  process-runner smoke now proves that participant path through a completed
  projected `runtime.source_history.reconcile` command receipt;
  target-specific `source_history_publication` resources are intentionally not
  accepted for reconcile because reconcile can mutate the runner-owned source
  workspace;
- Host now returns an effective proposal id for every artifact source-change
  proposal acknowledgement and sends that same id to the runner as the
  candidate id to create;
- Host projection now exposes `runtimeCommandReceipts` for runner-signed
  `runtime.command.receipt` observations, and artifact proposal completion is
  correlated by command id, effective proposal id, and candidate id;
- artifact restore, source-history publication/replay, and wiki publication
  now emit the same signed command receipt model, correlated with restore,
  source-history, replay, or wiki artifact result ids where available;
- runtime command receipts now preserve optional requester attribution, and the
  running User Client state and `entangle user-nodes command-receipts <nodeId>`
  read Host's scoped `/v1/user-nodes/:nodeId/command-receipts` route for one
  participant, while Studio plus operator CLI retain full projection access;
- the running User Client now also shows the Host-projected status of its own
  `human_interface` runtime: assignment, runner, desired/observed state,
  last-seen timestamp, projected client URL, restart generation, and status
  message;
- the headless `entangle user-nodes clients` roster now joins Human Interface
  Runtime placement with per-User-Node conversation count, unread count,
  pending approval count, latest message time, participant-requested command
  receipt count, and failed command receipt count;
- Studio's User Node roster reports the same participant-requested command
  receipt count and failed receipt count alongside its existing conversation
  and Human Interface Runtime placement summary;
- the running React User Client now renders a compact Workload panel from the
  participant projection: conversations, open work, unread messages, unique
  pending approvals, pending source reviews, command receipt statuses,
  source-history/wiki refs, and reachable targets;
- the Human Interface Runtime fallback HTML client renders the same Workload
  categories from the participant-scoped state object;
- the running User Client can now request runner-owned artifact restore for
  artifacts visible in the selected User Node conversation, and the
  process-runner smoke proves that path through a completed projected
  `runtime.artifact.restore` command receipt;
- lifecycle start/stop/restart and session cancellation now emit
  `runtime.command.receipt` observations as command-id closure while keeping
  assignment receipts and session observations as the domain lifecycle model;
- source-history commits and published source-history artifact commits now use
  resolved primary git principal attribution when available, aligning
  git-facing contribution metadata with each node's configured profile;
- the largest remaining gaps are richer collaborative wiki merge UI beyond
  conflict-base and patch-draft recovery, repository lifecycle and fallback/replication
  behavior, infrastructure-backed multi-machine proof execution, production
  identity/authorization, richer participant review batching, and deeper
  delegated-session runtime semantics.

The Human Interface Runtime now has a first usable running User Client for
human graph participants. It can inspect projected inbox state, publish
User Node messages, respond to approval requests, review artifact/wiki/source
evidence, use local JSON APIs for selected conversation detail, conversation
read state, and message publishing, and submit signed source-candidate
accept/reject messages that the owning runner applies to runner-owned candidate
and source-history state. A
first dedicated `apps/user-client` app now consumes that runtime JSON API, and
the runtime can serve static User Client assets from
`ENTANGLE_USER_CLIENT_STATIC_DIR`. The
federated dev runner image now bundles that built app, and the Docker launcher
adapter can publish a browser-openable User Client port for User Node runtime
contexts. Human Interface Runtime routes can require optional runtime-local
Basic Auth through `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password`,
with `/health` left public for liveness checks. The dedicated app now reaches
runtime-local JSON routes for artifact preview, source diff, source file
preview, source-candidate review, wiki
preview cards, and automatic thread read-state convergence, with source and
artifact evidence scoped to selected User Node conversations. Studio
remains the operator surface, not the primary human-node client. Approval
records now preserve optional signed-message lineage for request/response
event ids, signer pubkeys, and source message id, making User Node approval
behavior auditable through the shared runtime approval record. Runners now
enforce the approval record's approver node set before applying inbound
approval responses. Runner A2A envelopes now carry signer pubkeys when
available, Nostr delivery verifies the NIP-59 seal signer and drops
seal/rumor/fromPubkey mismatches, and service handling rejects mismatched
signer envelopes before state mutation. User Client approval responses now
preserve the originating approval-request turn id, keeping signed human
decisions correlated with the agent turn they answer. User Node
inbox records now preserve signer pubkeys for inbound and outbound messages
when available, and Host rejects inbound User Node message records whose signer
differs from the payload `fromPubkey`. CLI compact User Node message summaries
and User Client timeline headers now expose signer audit state when available.
The process-runner smoke now verifies signer preservation across User Node
publish responses, Host inbox records, User Client conversation records,
source-change review, approval response, synthetic inbound agent messages, and
the second User Node path.

The process-runner smoke now auto-serves built `apps/user-client/dist` assets
when available, or an explicit `--user-client-static-dir`, so manual
`--keep-running` sessions can exercise the dedicated User Client from the real
running User Node runtime. CLI now also exposes
`entangle user-nodes clients --summary` to list active User Nodes with their
projected Human Interface Runtime placement and User Client URLs.
`pnpm ops:demo-user-node-runtime` now wraps that shortest interactive path by
building the dedicated User Client, starting the development relay, and running
the process-runner proof in `--keep-running` mode.
`pnpm ops:demo-user-node-runtime:studio` can now launch Studio automatically
after the keep-running proof exposes the ephemeral Host URL and operator
token, while keeping the projected User Client URLs as the separate human-node
participant surfaces.
`pnpm ops:smoke-demo-tools` verifies the demo command surface through
no-infrastructure syntax, help, and dry-run checks for the base, Studio,
fake OpenCode, and fake `external_http` paths.
`pnpm ops:demo-user-node-runtime:fake-opencode` runs the same keep-running
path with the attached fake OpenCode server profile, so operators can inspect
User Node approval and attached-engine continuity without live model
credentials.
`pnpm ops:distributed-proof-kit` now prepares a copyable three-runner proof kit
for a reachable Host/relay/git topology, including Host-derived runner join
configs, runner-local env/start scripts, and operator trust/assignment/User
Node message commands for machines that do not share Host filesystem state.
The kit defaults the agent runner to `opencode_server`, can generate a custom
agent-engine capability with `--agent-engine-kind <kind>`, and writes a
matching verifier command into the operator script. Custom runner ids and graph
node ids are also carried into `operator/proof-profile.json`, which the
generated verifier command reads.
With `--fake-opencode-server-url <url>`, the same kit now prepares Host
operator commands that upsert a deterministic attached fake OpenCode profile,
bind the agent node to it, and write optional runner Basic-auth env for
no-credential distributed checks.
The kit can also configure generic custom engines with
`--external-process-engine-executable` or `--external-http-engine-url`, upsert
the matching Host profile, and bind the agent node before assignment.
That profile is now a typed package contract and a script-validated ops
contract, so malformed schema versions or assignment/runtime-kind mismatches
fail before Host inspection.
The proof kit can also generate relay-health verifier profile settings when
explicit relay URLs are supplied.
Generated kits now also include repeatable `operator/verify-topology.sh` and
post-work `operator/verify-artifacts.sh` verifier scripts, plus a stricter
`operator/proof-profile-post-work.json` profile for work/publication evidence.
Those generated verifier scripts can now persist JUnit XML as `topology.xml`
and `artifacts.xml` when `ENTANGLE_PROOF_JUNIT_DIR` is set.
`pnpm ops:distributed-proof-verify` now checks an already-running distributed
proof through Host HTTP APIs and optional User Client health endpoints, covering
Host Authority, runner trust/liveness/runtime-kind and agent-engine
capabilities, assignments, projection, default `running` runtime observations,
distinct multi-user User Client URLs, and optional conversation evidence
without reading Host or runner files; custom proof profiles can override the
expected agent engine kind while OpenCode remains the default.
Generated proof profiles and verifier runs can now also opt into
`requireExternalUserClientUrls`, which rejects loopback or wildcard projected
User Client URLs when a physical multi-machine proof needs to show that
human-node clients are reachable beyond their own host.
They can also opt into `requireExternalHostUrl`, which rejects loopback or
wildcard Host API URLs for physical proof runs.
The proof kit generator now applies that external Host URL requirement before
writing kit material, so loopback, wildcard, malformed, or non-HTTP(S) Host
URLs fail at generation time when the physical-proof guard is requested.
They can also opt into `requireExternalRelayUrls`, which rejects loopback or
wildcard relay WebSocket URLs for physical proof runs. This is separate from
relay health probing: external relay URL checks validate proof topology shape,
while `--check-relay-health` opens the configured WebSocket from the operator
machine.
They can also opt into `requireExternalGitUrls`, which rejects loopback,
wildcard, malformed, or file-backed git service coordinates for physical proof
runs. This is separate from git backend health probing: external git URL
checks validate Host catalog `baseUrl` and `remoteBase` shape, while
`--check-git-backend-health` opens the selected service base URL from the
operator machine.
They can also opt into `requireExternalAgentEngineUrls`, which rejects
loopback or wildcard URL-backed default agent engine profiles for physical
proof runs. Executable-only engine profiles remain valid because they execute
inside the runner boundary rather than through a cross-machine HTTP endpoint.
When a proof profile carries explicit assignments, the verifier now uses those
manifest assignment ids rather than deriving ids from runner ids.
Generated proof profiles now also carry primary User Node conversation and
User Client health requirements, so profile-only verification keeps the same
topology strength as the generated operator scripts.
The verifier can also require projected artifact/source/wiki evidence from the
agent node after work is produced with `--require-artifact-evidence`.
It can now also require published git artifact or source-history publication
evidence from that agent node with `--require-published-git-artifact`.
When proof kits are generated with `--check-published-git-ref`, the verifier
can also run `git ls-remote` from the operator machine against projected
published git artifact refs and require the advertised branch to contain the
projected commit.
It can additionally check configured relay WebSocket reachability with
`--check-relay-health`.
It can also check Host catalog git backend suitability with
`--check-git-backend-health`, rejecting missing or file-backed git services and
probing the selected public git service `baseUrl` from the operator machine.
For faster topology-shape checks, `--require-external-git-urls` can require
the same catalog service coordinates to be non-loopback, non-wildcard, and
non-file without probing the endpoint.
For attached OpenCode or `external_http` proof runs,
`--require-external-agent-engine-urls` can require the selected URL-backed
agent engine profile to be non-loopback and non-wildcard without probing the
endpoint.
Distributed proof tooling now also rejects credentials embedded in attached
OpenCode or `external_http` engine URLs, and verifier agent-engine diagnostics
redact any credentialed catalog URL before printing checks.
`external_http` agent engine profiles can now store a typed runner-local
bearer-token environment variable reference; Host, CLI, Studio, runner
execution, and distributed proof kit generation pass only the environment
variable name while the runner reads the actual token from its own environment.
Host default catalog seeding can now store that env reference from
`ENTANGLE_DEFAULT_AGENT_ENGINE_HTTP_BEARER_TOKEN_ENV_VAR`, and the same
profile kind can now carry an explicit `healthUrl` seeded from
`ENTANGLE_DEFAULT_AGENT_ENGINE_HTTP_HEALTH_URL`; when present, the runner
probes it before posting a turn. Distributed proof-kit generation can also
carry `--external-http-engine-health-url` into generated Host operator
commands. The fake external HTTP engine smoke proves the authenticated fixture
path without real model credentials.
`pnpm ops:smoke-distributed-proof-tools` now gives CI a deterministic
no-infrastructure check for proof-kit syntax/help/dry-run paths and verifier
self-test JSON, including non-running runtime rejection and duplicated User
Client URL rejection plus wrong-runtime-kind and wrong-agent-engine rejection,
plus proof-kit and verifier non-default expected-agent-engine/profile manifest
paths, invalid proof-profile failure paths, proof-kit relay-health generation
paths, generated post-work artifact-verifier paths, required-artifact-evidence
success/failure paths, published-git-artifact success/failure paths,
published-git-ref success/failure paths, loopback User Client URL rejection,
loopback git service URL rejection, loopback agent-engine URL rejection, custom
proof-profile assignment ids, and relay-health success/failure paths plus
git-backend-health success/failure paths before a real distributed proof is
attempted. The verifier can also write JUnit XML with one testcase per check
for CI retention, and generated proof-kit verifier scripts expose that path
through `ENTANGLE_PROOF_JUNIT_DIR`.
Generated proof kits can also require User Client Basic Auth placeholders and
start-script checks for User Node runner machines, so physical proofs can avoid
publishing participant clients without at least runtime-local browser auth.
CLI operators can now run `entangle user-nodes clients --check-health` to probe
Host-projected User Client `/health` URLs from the operator machine and see
successes, failures, or bounded `--health-timeout-ms` timeout results inline
with the User Node client summary. They can add `--node <nodeId>` to narrow the
roster and optional health probe to one human participant.
Generated distributed proof operator commands now use that same CLI health
probe before the scripted User Node task, keeping manual proof execution
aligned with verifier health checks.
Host runtime synchronization now also preserves observed User Node
`human_interface` runtime projection records, so a runtime inspection refresh
does not hide live User Client endpoints for active User Nodes.
Studio now has first Host-backed assignment offer/revoke controls in the
Federation panel for assigning graph nodes, including User Nodes, to trusted
runners, plus runner trust/revoke controls through the Host runner registry
boundary and runner liveness/capability detail from the full Host runner
registry, plus assignment timeline operational summaries over runtime,
runner, source-history, replay, and command-receipt evidence with related
navigation to the existing operator panels, while keeping participant
chat/review inside the User Client.
Host status now also carries bounded federated control/observe transport
health, and CLI plus Studio render that Host-owned relay subscription status
without probing relay state directly. Host status also reports bounded
artifact backend cache availability, repository count, and size as derived
operator diagnostics without exposing Host filesystem paths, and Host API/CLI
operators can dry-run, clear, age-prune, max-size-prune, or target-prune by
git service/namespace/repository without mutating authoritative artifact or
projection state. Studio renders the same summary in the Host Status panel.
Host status now also reports the active bootstrap operator security posture:
tokenless deployments report `none`, single-token
`ENTANGLE_HOST_OPERATOR_TOKEN` deployments report normalized operator id and
bootstrap role, and `ENTANGLE_HOST_OPERATOR_TOKENS_JSON` or
`ENTANGLE_HOST_OPERATOR_TOKENS_FILE` deployments report a tokenless list of
bootstrap operator ids and roles. Multi-token records can use `tokenSha256`
instead of raw token values and can opt into explicit Host permissions for
scoped bootstrap access. Bootstrap token records can now also
carry expiration timestamps; expired tokens do not authorize Host API or
WebSocket operator requests, and Host status reports only non-secret expiry
metadata. Explicit bootstrap operator ids and roles now fail fast when
malformed while omitted fields still use bootstrap defaults.
CLI can now generate a Host-derived `runner-join.json` with
`entangle runners join-config`, and the runner package advertises
`entangle-runner join --config` for generic runner startup outside smoke
scripts. Generic joined runners now also emit periodic signed
`runner.heartbeat` observations carrying accepted assignment ids and
capacity-derived operational state, keeping Host projection live after the
initial `runner.hello`. The heartbeat interval can be written into
`runner-join.json`, and the process-runner smoke now validates projected
heartbeats from the real joined agent runner and User Node runners.
Docker managed runners can now receive join config as inline JSON env, and the
federated dev Compose profile selects Docker join mode with Host API bundle
retrieval instead of mounting Host state just to read `runner-join.json`.
Docker join bootstrap is now also the launcher default; direct runtime-context
startup remains explicit compatibility/debug behavior. Runner process startup
now also requires `join`, join-config env, or an explicit runtime-context path
instead of guessing an injected context file.
Runtime-context runner startup and the Human Interface Runtime now share the
same mounted-file and environment-variable identity secret delivery support as
generic runner join config.

The contract-ownership layer is now also explicit:

- `packages/types` should own the primary `zod` schemas and host API DTO
  contracts;
- `packages/validator` should own semantic validation on top of those schemas;
- generated artifacts such as JSON Schema should remain derivative, not primary.

The repository now also contains the first real implementation baseline:

- a `pnpm` + Turborepo monorepo scaffold;
- `apps/studio` and `apps/cli`;
- `apps/user-client` for the human graph participant surface;
- `services/host` and `services/runner`;
- `packages/types`, `validator`, `host-client`, `agent-engine`, and
  `package-scaffold`;
- a first same-machine Compose profile and service Dockerfiles;
- an explicit `deploy/federated-dev/` profile layout for Entangle same-machine deployment
  material, with shared script path constants instead of duplicated local
  Compose paths;
- an explicit `releases/` area for release-control packets, starting with the
  first operator-baseline packet;
- a persistent local host-state model under `.entangle/host`;
- a separate local secret root for host-owned runtime identities;
- a safer `entangle package init` path that exposes package name, package id,
  default node kind, and explicit overwrite controls over the shared scaffold
  utility;
- host-managed external principal bindings for git-facing identities, exposed
  through host routes, the shared host client, and the CLI, safely removable
  when unused, and now resolved into effective runtime context instead of
  remaining only in the written specification;
- host-resolved model-secret delivery in the effective runtime context, so live
  node execution now depends on actual credential availability rather than only
  on model endpoint selection;
- resolved git principal runtime bindings that now include secret-availability
  status and mounted-file delivery metadata for the current same-machine profile;
- deterministic primary git repository-target resolution in effective runtime
  context, based on explicit git service `remoteBase` contracts, resolved
  namespace hints, and graph identity;
- live host routes for catalog inspection/apply, package admission, graph
  inspection/apply, runtime inspection, runtime context access, and runtime
  desired-state mutation;
- an optional bootstrap host operator-token boundary through
  `ENTANGLE_HOST_OPERATOR_TOKEN` or multiple
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON` records, with bearer-token propagation
  through the shared host client, CLI, and Studio while the default same-machine
  profile remains tokenless for low-friction development, plus typed
  `security` audit events for protected mutation requests through
  `host.operator_request.completed` and operator-visible Host status reporting
  of the active bootstrap security posture; token-protected Hosts now enforce
  the bootstrap `viewer` role as read-only, include `operatorRole` in protected
  mutation audit events, can attribute requests to distinct bootstrap
  operators, and host-client/CLI event summaries now render those audit events
  with operator id, role, method, path, status, and auth mode; Host event list
  APIs now apply category, node, operator, status-code, and type-prefix filters
  before limit slicing;
- host-side runtime materialization for effective bindings, runtime intents,
  observed runtime records, workspace layout, immutable package-store-backed
  package surfaces, injected runtime context, and stable per-node runtime
  identity context;
- peer-identity-aware runtime edge routes where adjacent non-user node public
  keys are injected as non-secret route metadata and runner turn assembly now
  includes a bounded peer-route summary for graph-aware multi-node reasoning;
- controlled autonomous runner handoffs where structured engine
  `handoffDirectives` must resolve through effective edge routes, local
  autonomy policy, materialized peer pubkeys, and allowed handoff relations
  before the runner emits `task.handoff`, with emitted handoff ids carried
  through runner-turn, host-event, and client presentation contracts, and with
  runner-owned active-conversation reconciliation now keeping multi-handoff
  sessions active only while real delegated conversations remain open, with
  a runner-start repair pass that realigns stale active-conversation ids from
  durable conversation records, moves still-pending approval-gated drained
  sessions to `waiting_approval`, clears already-approved waiting gates, and
  safely completes drained active or unblocked waiting sessions before new
  transport intake begins, and with host-owned session summaries now
  exposing aggregate active-work ids plus conversation and approval lifecycle
  status counts plus conversation-level, approval-level, and session-level
  consistency findings for list-level operator inspection;
- a runtime-backend abstraction with a memory backend used in tests and a
  first Docker backend for the local operator profile, now mediated through a
  first-party Docker Engine API client rather than `docker` CLI shell-outs,
  plus persisted reconciliation snapshots, richer host status output, and a
  read-only secret-volume mount into runner containers;
- a Studio graph surface that now renders live host topology instead of a fake
  demo graph;
- canonical Federated Preview assets under `examples/federated-preview/` plus
  `pnpm ops:demo-federated-preview`, with the active runtime proof now routed
  through the process-runner agentic smoke and deterministic fake OpenCode
  engine instead of the retired model fixture path;
- a released L2 Federated Workbench slice with CLI package inspection, package
  tool-catalog validation, offline graph diffing, root-relative path handling
  for `pnpm --filter @entangle/cli dev`, headless session launch through the
  host API over host-resolved runtime context and the local relay, optional
  CLI launch wait polling through host session inspection, Studio
  selected-runtime session inspection through the same host API, shared graph
  diffing for CLI and Studio, Studio graph revision diff against active graph
  state, host-backed Studio active-graph validation, host graph import/export
  through the CLI, CLI graph template list/export commands for the canonical
  Federated Preview graph, artifact filtering by session id, bounded local
  report-artifact preview through the host API, CLI, and Studio, and runtime
  memory page inspection plus bounded preview through the host API, CLI, and
  Studio;
- a first L3 Agentic Node Runtime foundation where deployment catalogs must
  carry at least one agent engine profile, graph and node bindings can select
  an `agentRuntime`, effective runtime context exposes the resolved
  `agentRuntimeContext`, the default engine profile is OpenCode, and
  per-node source, engine-state, and wiki-repository workspace roots now exist,
  with the runner wired to a first safe OpenCode CLI/process adapter for
  primary node turns that now isolates OpenCode DB/config/XDG state under the
  node engine-state workspace, probes OpenCode version before turns, applies
  bounded probe/run process timeouts, probes attached OpenCode server
  health/version before `--attach` turns when configured, exposes CLI catalog
  upsert/list/get plus Studio visibility/editing for attached/process engine
  profiles, and persists generic
  engine-session ids
  plus engine versions and permission-block observations on turn outcomes,
  including `policy_denied` results when OpenCode one-shot CLI auto-rejects a
  permission request, with explicit engine-profile `permissionMode`
  configuration for OpenCode auto-reject, opt-in auto-approve, and attached
  server `entangle_approval` bridging through signed Entangle approval
  messages, all visible in Host runtime inspection, CLI summaries, and Studio,
  plus bounded generic tool evidence from OpenCode JSON events, including tool
  titles, redacted input summaries, output summaries,
  durations, and call ids, plus adapter-local mapping from Entangle session ids
  to OpenCode session ids so later turns pass `--session` and keep node-local
  coding context, with the process-runner smoke now proving that continuation
  path through a second User Node task and Host-projected engine outcome, while
  the federated dev runner image now installs
  pinned `opencode-ai@1.14.20` and verifies `opencode --version` during image
  build, and host runtime inspection now carries a generic agent-runtime
  summary plus workspace-health status consumed by the shared host-client, CLI,
  and Studio, and runner-owned source workspace change
  harvesting now records bounded changed-file and diff summaries on turns,
  host events, runtime inspection, CLI output, and Studio details, plus durable
  pending source-change candidate records with host, CLI, and Studio
  inspection plus bounded candidate diff, listed-file previews, and audited
  review lifecycle through signed User Node review messages plus runner-owned
  source-history application for accepted candidates with signed
  `source_history.ref` projection, and
  runner-owned source-history publication that turns accepted source-history
  commits into git commit artifacts with durable publication metadata; explicit
  operator publish/retry requests now travel as Host-signed
  `runtime.source_history.publish` commands to the accepted runner assignment,
  and explicit operator replay requests now travel as Host-signed
  `runtime.source_history.replay` commands to the accepted runner assignment,
  with both CLI and Studio source-history detail using that Host request path
  and replay outcomes visible through Host projection. Artifact restore
  requests now travel as Host-signed `runtime.artifact.restore` commands to
  the accepted runner assignment, with the runner retrieving projected artifact
  refs into runner-owned state and emitting `artifact.ref` retrieval evidence;
  CLI and Studio expose that same request path from artifact inspection
  surfaces.
  Node-configured source mutation policy is now able to require approved runtime
  approval ids before source application or source publication, while
  validating approval operation and concrete resource scope before accepting a
  supplied approval id, with a host/CLI/Studio operator decision path for
  creating scoped approvals or deciding pending approvals,
  with bounded host/CLI/Studio history and diff inspection for supported
  materialized git artifacts, with direct Host artifact restore/promotion
  mutations removed and artifact restore now returned as runner-owned protocol
  behavior through CLI/Studio operator requests while artifact-to-source work
  now returns as runner-owned source-change proposal behavior exposed through
  CLI/Studio operator requests and conversation-scoped User Client controls,
  with effective proposal ids returned for candidate follow-up, and with
  runner-owned local git
  snapshots of `memory/wiki` into
  each node's `wiki-repository` workspace after completed turns, including
  durable sync outcomes on turns, host events, CLI output, and Studio turn
  inspection, plus
  `entangle deployment doctor` runtime wiki repository health warnings for
  uninitialized, dirty, or uncommitted snapshots. Direct Host-mediated
  wiki-repository publication has been removed from Host/CLI/Studio because it
  required Host-readable runner filesystem state; explicit wiki publication
  now returns as a Host-signed `runtime.wiki.publish` command that the accepted
  runner executes from runner-owned wiki state, with CLI and Studio requesting
  that same Host control path, publishing to the primary git target by default
  or to an explicit resolved git target selector and emitting signed
  `artifact.ref` evidence, and the process-boundary smoke now verifies that
  request with a real joined runner by checking Host projection plus the
  primary and non-primary git branch heads. Public deep runtime reads for
  accepted federated assignments now ignore Host-local runtime files and use
  projected runner evidence instead, while non-federated adapter reads remain
  available. With bounded engine-request summaries on executable turns so CLI and Studio turn
  inspection can show prompt part counts, aggregate prompt size, memory,
  artifact, and tool counts, execution limits, and peer-route inclusion without
  exposing raw prompt text, runtime-local paths, or engine-specific payloads,
  while executable turn assembly now explicitly includes agent-runtime,
  workspace-boundary, autonomy/source-mutation policy, and inbound
  response/constraint control context for the node-local coding engine, plus
  an Entangle action contract that lets OpenCode propose validated handoff
  directives and policy-scoped approval request directives through bounded
  `entangle-actions` output blocks, with unauthorized or unroutable handoffs
  classified as `policy_denied` while preserving bounded engine evidence, and
  with engine-requested approvals materialized as pending runner approval
  records that move the session/conversation lifecycle to
  `waiting_approval`/`awaiting_approval` without granting the engine the
  gated side effect, with external session cancellation now delivered as a
  Host-signed `runtime.session.cancel` control command for accepted federated
  runner assignments and rejected when no accepted federated assignment/control
  path is available, observed by node runners while idle or mid-turn, and
  translated into engine abort signals for OpenCode-backed
  turns, and with generic runtime inspection now surfacing pending
  approval blockers plus the latest produced artifact and requested approval
  ids through the shared host/CLI/Studio boundary, and with runner-served User
  Clients now rendering runtime identity, Host API, relay status, and
  lightweight live refresh over `/api/state`, plus local JSON APIs for selected
  conversation detail, conversation read state, and message publishing;
- an explicit package tool-catalog contract through `runtime/tools.json`,
  validator enforcement, and scaffolded empty catalogs;
- a runner bootstrap that now consumes injected runtime context, package
  prompts, runtime config, and seeded memory instead of a hardcoded request;
- a first real provider-backed `agent-engine` slice with an internal Anthropic
  adapter, official SDK wiring behind the stable engine boundary, normalized
  one-turn execution, explicit model auth-mode contracts with the correct
  Anthropic local default, and an internal adapter path that is no longer the
  public node-runtime profile;
- a second provider-backed `agent-engine` slice with an OpenAI-compatible chat
  completions adapter behind the same internal engine boundary, preserving
  provider-agnostic runner contracts while supporting bearer-token auth,
  prompt rendering, usage/stop normalization, bounded tool-call loops, and a
  deterministic local HTTP provider fixture that tests the real `fetch` path
  without live provider credentials;
- a first bounded tool-execution slice where the runner now loads
  package-declared tool catalogs into turn assembly, the runtime owns an
  Entangle builtin tool executor boundary, and the Anthropic adapter can
  complete internal `tool_use` / `tool_result` loops without leaking provider
  protocol logic into the runner surface;
- a bounded builtin-tool widening slice where the runner can now inspect
  bounded memory refs from the current turn through `inspect_memory_ref`, and
  a further bounded runtime-local inspection slice where the runner can now
  inspect current session state through `inspect_session_state`, both without
  widening host surfaces or granting arbitrary filesystem access;
- a first deterministic post-turn memory-maintenance slice where completed
  turns now write task pages into the node wiki, append structured entries to
  `memory/wiki/log.md`, keep `memory/wiki/index.md` aligned, and feed the
  freshest task memory back into subsequent turn assembly;
- a richer deterministic memory-summary slice where the runner now rebuilds
  `memory/wiki/summaries/recent-work.md` from canonical task pages and feeds
  that summary back into future bounded turn assembly;
- a first bounded model-guided memory-synthesis slice where the runner now
  maintains `memory/wiki/summaries/working-context.md` through a strict
  forced tool call while preserving runner ownership of the actual wiki
  write path and keeping synthesis failure additive rather than turn-fatal;
- a session-aware refinement of that working-context synthesis path where the
  model-guided summary now also consumes the same bounded current-session
  snapshot exposed through `inspect_session_state`, instead of leaving session
  reasoning trapped in the builtin tool path alone;
- an approval-aware refinement of that session snapshot where
  `inspect_session_state` and model-guided memory synthesis now carry bounded
  approval summaries, waiting-gate counts, and recorded approval status context
  alongside conversation, turn, and artifact context;
- an approval-gate carry-forward refinement where the durable
  `working-context.md` page now preserves deterministic waiting approval ids
  and bounded approval-record summaries instead of relying only on model prose
  to keep approval blockers visible to later turns;
- a first approval-message handling slice where `approval.request` and
  `approval.response` now have explicit A2A metadata contracts and the runner
  materializes pending approval gates, applies approved decisions, closes
  approved approval conversations when policy allows, completes unblocked
  waiting sessions, and relies on the canonical A2A validator to reject
  malformed approval metadata plus approval-specific response-policy loops
  before local lifecycle state is written, while orphan approval responses that
  match no local session, conversation, or approval record are absorbed without
  creating phantom active work;
- an artifact-aware refinement of that same synthesis path where the runner now
  passes explicit retrieved and produced artifact context into working-context
  synthesis, instead of leaving work-product visibility trapped in the main
  task-execution path alone;
- an artifact-context carry-forward refinement of that same synthesis path
  where the durable `working-context.md` page now preserves deterministic
  consumed/produced artifact context plus bounded model-guided artifact
  insights instead of leaving artifact awareness trapped in request-time
  context alone;
- an engine-outcome-aware refinement of that same synthesis path where the
  bounded synthesis prompt now carries the just-completed turn's normalized
  engine outcome instead of relying on assistant text and coarse stop reason
  alone;
- an execution-insight carry-forward refinement of that same synthesis path
  where the durable `working-context.md` page now preserves bounded execution
  insights instead of leaving current-turn execution awareness trapped in
  prompt-time context alone;
- an execution-aware deterministic memory-baseline refinement where
  runner-owned task pages and the derived recent-work summary now preserve
  richer normalized execution detail before any model-guided synthesis
  widening is applied;
- a final-state session-context refinement of that same synthesis path where
  optional working-context synthesis now runs against final post-turn
  conversation/session state and the durable `working-context.md` page now
  preserves bounded session-context signals instead of leaving session
  awareness trapped in prompt-time context alone;
- a source-change-aware refinement of that same synthesis path where optional
  model-guided memory synthesis now receives bounded current-turn
  source-change evidence from `RunnerTurnRecord`, including candidate ids,
  totals, changed-file summaries, preview metadata, and diff availability
  without copying raw diffs or full file previews into durable memory;
- a source-change carry-forward refinement where the durable
  `working-context.md` page now preserves runner-owned source-change context,
  including candidate ids, totals, changed-file summaries, file-preview
  metadata, and diff availability, instead of depending only on model prose to
  remember code-change evidence;
- a deterministic source-change ledger refinement where post-turn memory
  maintenance now rebuilds `summaries/source-change-ledger.md` from
  source-change-bearing task pages and feeds that page into future memory refs
  plus bounded memory briefs;
- a deterministic approval ledger refinement where post-turn memory
  maintenance now records bounded approval-request directives in task pages,
  rebuilds `summaries/approval-ledger.md`, and feeds that page into future
  memory refs plus bounded memory briefs;
- a memory-brief closure-context refinement where `summaries/resolutions.md`
  now appears in the bounded prompt brief when present, so future turns see
  recently closed questions and completed actions beside active work;
- a handoff-aware working-context refinement where optional model-guided memory
  synthesis receives bounded emitted-handoff evidence and the durable
  `working-context.md` page now records emitted handoff message ids without
  copying peer conversations or logs into node memory;
- a conversation-aware working-context refinement where the durable
  `working-context.md` page now records active conversation ids and bounded
  peer/status/response-policy/follow-up/artifact metadata from the runner-owned
  session snapshot, giving future turns deterministic coordination context for
  delegated sessions;
- an inbound-message working-context refinement where model-guided synthesis
  and durable `working-context.md` now record the triggering A2A event id,
  message type, from/to nodes, signer, response policy, and attached-artifact
  count without copying peer transcripts into node memory;
- an agent-engine inbound-routing refinement where per-node coding engine
  prompts now receive conversation id, turn id, parent message id, and from/to
  node ids in bounded inbound controls while Entangle keeps authority over
  routing and side effects;
- an agent-engine memory-brief refinement where per-node coding engine prompts
  now receive a bounded inline brief from focused node-memory summaries when
  those pages exist, while complete wiki pages stay available through
  `memoryRefs`;
- a memory-synthesis brief-context refinement where model-guided post-turn
  synthesis now receives that same bounded `Memory brief:` prompt part, so
  focused register updates can use the compact current memory baseline while
  complete wiki pages stay available through `memoryRefs`;
- a participant review-queue batching refinement where the running React User
  Client and fallback Human Interface Runtime group pending review work by
  peer/node with bounded counts while keeping signed approval and source-change
  review actions in the conversation-specific flows;
- a CLI review-queue refinement where `entangle inbox review-queue --user-node
  <nodeId>` exposes the same grouped headless triage view over inbound approval
  and source-change review requests;
- a User Client workload review-total refinement where the running React client
  and fallback Human Interface Runtime show one total pending review count
  derived from the same Review Queue model;
- a handoff response-policy prompt refinement where coding engines can see the
  optional delegated-conversation lifecycle shape while Entangle runner
  validation remains authoritative;
- a coordination-map memory refinement where successful model-guided synthesis
  now writes `memory/wiki/summaries/coordination-map.md` with local node
  relation, owner/origin/entrypoint, inbound message provenance, active peer
  routes, approval gates, handoff obligations, and bounded durable
  coordination insights for future node turns;
- an owner-aware session-memory refinement where the bounded synthesis prompt
  and durable `working-context.md` page now record session owner,
  originating-node, entrypoint-node, last-message, and active-route metadata so
  delegated sessions resume with explicit topology context;
- a memory-synthesis observability refinement where optional synthesis now
  persists a canonical bounded outcome on `RunnerTurnRecord` and that same
  outcome now surfaces through host-owned runner activity and runtime-trace
  inspection instead of remaining trapped in wiki logs alone;
- a focused memory-summary-register widening where the same bounded
  model-guided synthesis pass now updates `working-context.md`,
  `stable-facts.md`, and `open-questions.md`, and future turns now consume
  those focused summaries directly instead of relying on one omnibus derived
  page alone;
- a decision-register refinement where that same bounded synthesis pass now
  updates `decisions.md`, the durable `working-context.md` page now carries
  bounded decision carry-forward, and future turns can consume prior
  decisions directly instead of inferring them only from broader summary
  prose;
- a next-actions register refinement where that same bounded synthesis pass
  now updates `next-actions.md`, open questions no longer act as the only
  focused pending-work surface, and future turns can consume durable next
  actions directly instead of inferring them only from `working-context.md`
  or the mixed open-questions page;
- a resolutions-register refinement where that same bounded synthesis pass now
  updates `resolutions.md`, recent closures no longer disappear implicitly
  from focused memory, and future turns can consume durable resolved
  questions and completed actions directly instead of inferring closure only
  from rewritten prose;
- a focused-register lifecycle-discipline refinement where that same bounded
  synthesis pass now sees the current open-questions/next-actions/resolutions
  baseline explicitly and runner-owned reconciliation removes exact resolved
  overlaps from active registers instead of letting closure drift survive as
  silent duplication;
- a focused-register aging-signals refinement where the runner now persists a
  separate carry-state file for the focused registers and feeds bounded
  stale-review hints back into synthesis for repeatedly carried active items,
  without adding noisy lifecycle metadata to the durable wiki pages;
- an explicit closure-reference refinement where the bounded synthesis path can
  now retire active open questions and next actions through runner-validated
  references to the current baseline, even when the new resolutions wording
  differs from the original active entry text;
- a stale-item disappearance-discipline refinement where stale review
  candidates from the focused-register baseline may no longer disappear
  silently: the runner now requires explicit retention or explicit retirement
  semantics for those entries;
- an explicit stale-item replacement refinement where stale open questions and
  next actions may now be replaced deterministically by narrower active items
  through runner-validated `from -> to` mappings instead of being forced to
  stay active or pretend to be resolved;
- an explicit stale-item consolidation refinement where multiple stale open
  questions or next actions may now collapse deterministically into one
  narrower active successor through runner-validated many-to-one mappings
  instead of surviving as overlapping active noise;
- a focused-register transition-history refinement where the runner now
  persists bounded runtime-local lifecycle audit entries for closure,
  completion, replacement, consolidation, and exact resolution-overlap
  retirements while keeping the core wiki pages clean and human-readable, and
  now also writes an indexed
  `summaries/focused-register-transition-history.md` page so future turns and
  projected wiki evidence can inspect that lifecycle audit;
- a first bounded engine-turn observability slice where the internal tool loop
  now records structured tool requests plus bounded tool-execution outcomes,
  and normalized engine outcome now persists through runner-turn state into
  host-owned runner activity events;
- a shared runtime-trace consumption slice where `packages/host-client` now
  owns bounded labels and detail-line generation for runtime-trace events, and
  both Studio and CLI consume that shared presentation over the existing
  host-owned event surface;
- a bounded provider-metadata and engine-failure-reporting slice where
  successful turns now preserve normalized provider identity, failed turns now
  persist bounded failure payloads, and successful engine outcomes survive
  later artifact-materialization failure in durable runner state;
- a first typed host-event surface where `entangle-host` now persists
  canonical event records, lists them over `GET /v1/events`, streams them over
  WebSocket on the same route, and exposes the shared event boundary through
  `packages/host-client` for Studio and CLI live usage;
- a typed graph-revision history surface where `entangle-host` now persists
  canonical revision records, exposes `GET /v1/graph/revisions` plus
  `GET /v1/graph/revisions/{revisionId}`, keeps backward compatibility with
  older raw graph-snapshot revision files, and shares that inspection boundary
  through `packages/host-client` and the CLI;
- a first resource-oriented node surface where `entangle-host` now exposes
  applied non-user node bindings through `GET /v1/nodes` and
  `GET /v1/nodes/{nodeId}`, and shares that inspection boundary through
  `packages/host-client` and the CLI;
- a first resource-oriented managed-node mutation surface where
  `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`,
  and `DELETE /v1/nodes/{nodeId}`, keeps the graph as the only source of
  truth, rejects deletion while edges still reference the node, and emits
  typed `node.binding.updated` control-plane events;
- a first resource-oriented edge mutation surface where `entangle-host` now
  supports `GET /v1/edges`, `POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
  `DELETE /v1/edges/{edgeId}`, keeps topology mutations on the validated
  graph-apply path, and emits typed `edge.updated` control-plane events;
- a first-class runtime restart surface where `entangle-host` now supports
  `POST /v1/runtimes/{nodeId}/restart`, persists monotonic restart
  generations in runtime intents, emits typed `runtime.restart.requested`
  host events, and forces deterministic Docker runtime recreation when the
  restart generation changes;
- richer reconciliation and degraded-state semantics where runtime inspection
  now carries derived reconciliation state plus finding codes, persisted host
  reconciliation snapshots distinguish blocked, transitioning, and degraded
  runtimes, and `GET /v1/host/status` now derives health from explicit
  reconciliation findings instead of raw failure counts alone;
- a host-owned runtime recovery-history surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/recovery`, persists per-node recovery
  records under observed host state, deduplicates unchanged runtime states
  with canonicalized fingerprints, and serializes host reconciliation reads so
  identical successive inspections do not create duplicate history entries;
- an explicit host-owned runtime recovery-policy slice where `entangle-host`
  now persists desired recovery-policy records, observed recovery-controller
  state, exposes `PUT /v1/runtimes/{nodeId}/recovery-policy`, and can perform
  bounded automatic `restart_on_failure` recovery against stable failure
  fingerprints instead of treating retries as implicit or unbounded behavior;
- a widening of the host recovery event surface where `entangle-host` now
  emits durable `runtime.recovery.recorded` and
  `runtime.recovery_controller.updated` events from the same host-owned
  recovery history and controller state already exposed through runtime
  recovery inspection, while suppressing trivial idle-bootstrap noise;
- a first serious runtime-recovery inspection slice across the shared clients,
  where `packages/host-client` now owns reusable host-event filtering helpers,
  `entangle-cli` supports typed `host events list` and `host events watch`
  flows with recovery-oriented filtering plus `host events integrity` for
  Host-side event hash-chain verification, Studio renders the same Host-owned
  integrity summary in Host Status, `host events integrity --signed` exports a
  compact Host Authority-signed integrity report, `host events audit-bundle`
  exports typed events plus bundle hashes and the signed integrity report, with
  `--output <file>` for explicit retention handoff and `--summary` for bounded
  terminal output, saved audit bundles can be checked offline with
  `host events audit-bundle-verify <file>` including embedded Nostr report
  signature validation, and Studio consumes the live host event stream to inspect
  runtime recovery
  policy, controller state, recovery history, and live recovery events without
  introducing a client-owned recovery model, with shared recovery presentation
  helpers and compact
  `host runtimes recovery --summary` output now keeping Studio and CLI
  vocabulary aligned;
- a broader host-owned trace-event slice where `entangle-host` now derives and
  persists `conversation.trace.event`, `approval.trace.event`, and
  `artifact.trace.event` from persisted runner state using the same
  deduplicated observed-state model already used for session and runner-turn
  activity;
- a deeper Studio runtime-inspection slice where the selected-runtime view now
  surfaces reconciliation state, finding codes, backend/context readiness,
  restart generation, and a live runtime-trace panel over host-owned session,
  conversation, approval, artifact, and runner-turn events without widening
  the host API or inventing client-side trace logic;
- a first bounded Studio runtime-lifecycle mutation slice where the selected
  runtime can now be started, stopped, and restarted strictly through the
  existing host lifecycle surfaces instead of through client-owned state;
- a bounded Studio recovery-policy mutation slice where the selected-runtime
  view can now apply manual or restart-on-failure policy records through the
  existing host recovery-policy boundary, with local draft validation matching
  host schema limits;
- a deeper Studio runtime-artifact inspection slice where the selected-runtime
  surface now exposes persisted artifact records from the host read model,
  including deterministic sorting, lifecycle/publication/retrieval summaries,
  and backend-aware locator summaries, while selected-runtime refresh now
  degrades partially under sub-read failures instead of failing wholesale;
- a deeper Studio runtime-session inspection slice where the selected-runtime
  surface now exposes host-backed session summaries relevant to that runtime,
  including per-node session status and trace ids;
- a deeper Studio runtime-approval inspection slice where the selected-runtime
  surface now exposes persisted approval records from the host read model,
  including deterministic sorting and host-backed selected-approval detail;
- a deeper Studio runtime-turn inspection slice where the selected-runtime
  surface now lists persisted runner turns and expands one selected turn into
  host-backed detail, including engine outcome, artifact linkage, trigger,
  phase, and memory-synthesis status;
- the first bounded Studio graph-mutation slice where the operator can now
  select, create, replace, and delete graph edges through host-owned mutation
  routes instead of keeping Studio fully read-only on topology;
- the next bounded Studio mutation slice where the operator can now create,
  replace, and delete managed nodes through host-owned mutation routes while
  selecting admitted package sources from Studio;
- the next bounded Studio mutation slice where the operator can now admit
  package sources directly through host-owned `local_path` /
  `local_archive` flows and inspect the admitted inventory without leaving the
  graph editor surface;
- the host-side completion of `local_archive` package-source admission, where
  tar/tar.gz archives are extracted safely, validated as AgentPackage
  directories, imported under host-managed package storage, and recorded
  through the immutable package store rather than remaining a client-only
  request contract;
- the host-side package-source deletion boundary, where unused sources can be
  removed safely, active graph references block deletion with a typed conflict,
  `package_source.deleted` events refresh Studio overview state, and the CLI
  can perform or dry-run the mutation through the shared host client;
- the host-side external-principal deletion boundary, where unused git-facing
  principal records can be removed safely, active graph references block
  deletion with a typed conflict, `external_principal.deleted` events refresh
  Studio overview state, and the CLI can perform or dry-run the mutation
  through the shared host client;
- the matching Studio package-source deletion flow, where the graph editor
  lists active source references, disables known-conflicting deletes, calls the
  host-owned deletion route for unreferenced sources, and clears stale local
  drafts after host confirmation;
- the matching Studio external-principal lifecycle slice, where the graph
  editor lists host-bound principal records, shows effective active-graph
  references, disables known-conflicting deletes, and calls the host-owned
  deletion route for unreferenced principal bindings;
- the next bounded Studio completion slice where the operator surface now uses
  the existing host event stream to coalesce live overview and
  selected-runtime refresh instead of depending only on explicit post-mutation
  reloads;
- the matching Studio graph-revision history slice, where the host status
  panel now lists persisted applied graph revisions and drills into one
  host-backed topology snapshot without adding client-owned revision truth;
- the next bounded CLI parity slice where headless operators can now inspect
  one admitted package source and admit canonical `local_path` or
  `local_archive` sources with optional explicit package-source ids instead of
  relying on a directory-only shortcut;
- the next bounded CLI parity slice where headless operators can now inspect
  persisted runtime artifacts through the existing host artifact surface and
  apply deterministic local filters over backend, kind, lifecycle,
  publication, and retrieval state;
- the next artifact-governance slice where headless operators can now inspect
  one runtime artifact by id through the shared host boundary instead of
  reading runner-local artifact files directly;
- the matching Studio artifact-detail slice where visual operators can select
  one runtime artifact and inspect its host-backed item record without
  introducing client-owned artifact truth;
- the next bounded Studio completion slice where the operator can now select
  one runtime-scoped session summary and inspect host-backed per-node session
  detail through the existing session read surface, without introducing
  client-owned session state;
- the next bounded CLI completion slice where the main host-facing mutation
  commands now support `--dry-run`, printing canonical mutation payloads or
  intents without mutating the host;
- a host-owned session inspection surface where `entangle-host` now exposes
  `GET /v1/sessions` plus `GET /v1/sessions/{sessionId}`, aggregates persisted
  runner session records across the current host runtime set, and shares the
  same boundary through `packages/host-client` and the CLI, with aggregate
  active-conversation ids, conversation and approval lifecycle status counts,
  waiting approval ids, root artifact ids, optional conversation-level,
  approval-level, and session-level consistency findings, and latest message
  type on list summaries so event traces and session inspection share the same
  active-work and approval-gate vocabulary;
- a host-owned runtime approval inspection surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/approvals` plus
  `GET /v1/runtimes/{nodeId}/approvals/{approvalId}` through
  `packages/host-client`, CLI summaries/filters, and Studio selected-runtime
  drilldown, while public approval responses are signed User Node messages
  rather than operator-side Host mutations;
- a node agent-runtime configuration surface where the CLI can set or clear
  node-level runtime mode, engine profile, and default-agent overrides through
  `entangle host nodes agent-runtime`, while Studio's Managed Node Editor loads
  catalog engine profiles and writes the same graph-backed `agentRuntime`
  fields through existing host-client node mutation methods;
- a host-owned runner-turn inspection surface where `entangle-host` now exposes
  `GET /v1/runtimes/{nodeId}/turns` plus
  `GET /v1/runtimes/{nodeId}/turns/{turnId}` and shares the same boundary
  through `packages/host-client` and the CLI for audit workflows that need
  persisted turn records instead of event summaries only;
- bounded tool-execution diagnostics where normalized tool observations now
  carry optional diagnostic messages that flow into runner memory, shared
  runtime-trace details, and Studio runner-turn detail;
- shared runtime-turn presentation helpers in `packages/host-client`, with
  Studio consuming the same formatting and the CLI exposing compact
  `host runtimes turn --summary` and `host runtimes turns --summary` output;
- shared session presentation helpers in `packages/host-client`, with Studio
  consuming the same formatting and the CLI exposing compact
  `host sessions list --summary` and `host sessions get --summary` output;
- shared runtime-artifact presentation helpers in `packages/host-client`, with
  Studio consuming the same formatting and the CLI exposing compact
  `host runtimes artifact --summary` and `host runtimes artifacts --summary`
  output, including shared selected-artifact preview, history, and diff
  status formatting plus restore status formatting for headless and visual
  restore operations;
- shared graph-topology presentation helpers in `packages/host-client`, with
  Studio consuming the same graph revision, managed-node, and edge vocabulary
  and the CLI exposing compact `--summary` output for active graph, graph
  revision, node, and edge inspection;
- shared resource-inventory presentation helpers in `packages/host-client`,
  with Studio consuming the same package-source and external-principal
  vocabulary and active-reference summaries, and the CLI exposing compact
  `--summary` output for package-source and external-principal list/detail
  inspection;
- shared runtime-inspection presentation helpers in `packages/host-client`,
  with the CLI exposing compact `host runtimes list --summary` and
  `host runtimes get --summary` output over runtime state, reconciliation,
  context readiness, restart generation, backend, package source, runtime
  handle, and git provisioning signals;
- shared host-status presentation helpers in `packages/host-client`, with
  Studio's Host Status panel and the CLI exposing compact output over service
  health, runtime counts, reconciliation counts, session diagnostics, finding
  codes, graph revision, backend, and last reconciliation time, and with
  Studio overview refresh treating session and conversation activity as
  status-relevant because those events can change top-level session
  diagnostics;
- a widening of the host event surface where `entangle-host` now derives
  `session.updated` plus `runner.turn.updated` records from persisted runner
  session and turn state, with `session.updated` now preserving
  active-conversation ids, conversation and approval lifecycle counts, bounded
  session consistency finding diagnostics, root artifact ids, and last message
  type so runtime traces can distinguish active work, approval state, approval
  gate drift, and drift from session history, while persisting those
  observations under observed host state and emitting them only when the durable
  observed fingerprint changes;
- a deterministic runner transport abstraction, file-backed runner-Entangle state
  store, and long-lived `RunnerService` that subscribes by recipient pubkey,
  validates inbound A2A payloads, persists session/conversation/turn records,
  and emits bounded `task.result` replies when required;
- a first git-backed artifact materialization slice in the runner, with
  persisted artifact records, session/conversation/turn artifact linkage,
  committed markdown turn reports under the runtime artifact workspace, and a
  host collection and item read surface for runtime artifact inspection;
  protocol-facing
  `ArtifactRef` locators are now kept portable while runtime-local filesystem
  details remain under persisted artifact-record materialization metadata, and
  artifact records now also carry explicit publication-state metadata so local
  materialization and remote publication are not conflated; the runner can now
  also publish to deterministic preexisting remote repositories while
  preserving local artifact truth if publication fails; it can also retrieve
  published git handoffs from locator-specific repository targets into an
  explicit retrieval cache partitioned by service, namespace, repository, and
  artifact id, with deterministic service-scoped git-principal selection and
  typed local artifact inputs into the engine request; the host now also
  provisions primary `gitea_api` repository targets itself, persists
  provisioning-state records, and treats provisioning failure as a
  runtime-realizability error instead of deferring it to the runner; URL-based
  runner git operations now support both SSH-key and HTTPS-token transport
  principals without writing token material into runtime files or remote URLs;
  runner-level integration coverage and the Docker-backed disposable runtime
  smoke now prove a real two-node handoff where one node publishes a git
  artifact to a remote and a downstream node retrieves that artifact into
  local engine context by `ArtifactRef`;
- a real Nostr runner transport using NIP-59 gift wrapping plus a dedicated
  Entangle rumor kind, with relay-readiness preconnect semantics at startup;
- a corrected local `strfry` deployment profile with an explicit mounted relay
  config instead of an invalid config-less command;
- a hardened local Docker image topology with an explicit `.dockerignore`,
  TypeScript incremental build metadata excluded from Docker contexts, clean
  service builds inside image stages, pinned `pnpm` installation and store
  semantics, a static Nginx Studio runtime, and verified host/runner portable
  deploy payloads built from the real `build -> deploy` path;
- a documented same-machine operator bootstrap profile under `deploy/`, backed by
  `pnpm ops:check-federated-dev` and `pnpm ops:check-federated-dev:strict` preflight checks
  for same-machine profile files, Node/pnpm, Docker, Docker Compose, daemon access,
  and Compose config validity;
- a first same-machine reliability doctor through `entangle deployment doctor`, with
  read-only human-readable and JSON diagnostics for same-machine profile files,
  Node/pnpm/Docker/Compose, the runner image, OpenCode availability on the host
  and inside the runner image, bundled User Client assets in the runner image,
  `.entangle/host`, Entangle state layout
  compatibility, live host status, host-reported state layout status,
  host-reported runtime workspace health, git principals, Studio, Gitea, and
  the local relay, plus strict and offline modes, and `entangle deployment
  diagnostics` now writes a redacted JSON support bundle with doctor output,
  bounded Compose status/logs, runner-image inspection, live host state, and
  bounded runtime evidence for turns, engine failures, permission decisions,
  approval blockers, artifact counts, and Host event audit-bundle evidence when
  available unless `--no-audit-bundle` is set, while
  `entangle deployment backup` and `entangle deployment restore` provide the
  first versioned `.entangle/host` backup and validated restore
  path without bundling Entangle secrets, and `entangle deployment repair` provides a
  dry-run-first conservative repair surface for safe host-state initialization
  missing layout-marker recovery, and missing standard host-state directory
  recovery; backup manifests now also record known excluded external service
  volumes for Gitea, strfry, and Host secret state, with
  `externalVolumeCount` in backup summaries; the federated dev Compose
  profile now gives those service volumes stable explicit names, and doctor
  warns when older Compose-prefixed service volumes are present; repair now
  surfaces those previous service volumes as manual migration actions;
  `entangle deployment service-volumes export/import` now provides a separate
  dry-run-capable Gitea/relay volume bundle path while still excluding Host
  secret state, and non-dry-run service-volume operations now require
  `--assume-services-stopped` plus a running-container check for each target
  volume before Docker archive commands execute; `entangle deployment
  service-volumes status` exposes the same readiness evidence as a read-only
  operator preflight, while `service-volumes stop-services/start-services`
  provide non-mutating service maintenance plans unless `--apply` is supplied,
  and `service-volumes health` checks post-maintenance Gitea/relay reachability;
- an active same-machine profile smoke through `pnpm ops:smoke-federated-dev`, covering
  running Compose services, the local runner image, host status/events, Studio
  HTTP, Gitea HTTP reachability, and the local `strfry` Nostr WebSocket
  subscription path;
- a functional federated process smoke through
  `pnpm ops:smoke-federated-process-runner`, covering Host plus a real joined
  runner process with separate state roots, signed assignment over a live relay,
  portable bootstrap materialization, signed runtime observations, a
  deterministic OpenCode-adapter task turn, projected turn/approval/session
  read APIs, and signed User Node message intake persisted by the assigned
  runner and projected by Host from runner-signed observations without requiring
  a live model-provider call;
- a same-machine diagnostics smoke through `pnpm ops:smoke-federated-dev:diagnostics`,
  which writes a temporary redacted diagnostics bundle against a running
  same-machine profile and validates its stable top-level shape;
- a same-machine reliability smoke through `pnpm ops:smoke-federated-dev:reliability`,
  which creates a temporary same-machine backup bundle, validates restore dry-run, and
  checks repair dry-run output against an initialized same-machine profile;
- a no-infrastructure service-volume smoke through
  `pnpm ops:smoke-deployment-service-volume-tools`, which verifies Gitea/relay
  service-volume export/import dry-run CLI output without Docker or live
  volumes;
- a disposable same-machine profile smoke through `pnpm ops:smoke-federated-dev:disposable`,
  covering strict preflight, runner image build, stable service startup,
  readiness probing through the active smoke, and teardown with volumes;
- an agentic runtime smoke through `pnpm ops:smoke-federated-dev:runtime` and
  `pnpm ops:smoke-federated-dev:disposable:runtime`, covering the current
  process-runner path with joined agent and User Node runners, deterministic
  fake OpenCode attached-server execution, signed User Node approval bridging
  for engine permissions, source/wiki/artifact projection, User Client routes,
  and disposable teardown;
- build outputs for deployable runtime packages that now exclude compiled test
  files, while typed linting keeps explicit coverage over tests through a
  tightly scoped out-of-project configuration;
- machine-readable Entangle A2A payloads and runner-local session,
  conversation, approval, and turn-state contracts owned by `packages/types`
  plus validator entrypoints for those surfaces in `packages/validator`;
- a real quality baseline with ESLint, Vitest, GitHub Actions CI, and
  socketless host service tests that keep ordinary verification portable in
  constrained sandbox or CI profiles;
- shared Vitest workspace-source resolution so package-local tests do not
  accidentally execute against stale sibling build outputs;
- shared ESLint test-project resolution through a root `tsconfig.eslint.json`,
  so typed linting over tests resolves current workspace sources instead of
  stale sibling declarations;
- an explicit composite TypeScript build graph with solution-build typechecking
  for internal packages and Node services;
- targeted tests over validator semantics, host-client error handling, package
  scaffolding, host API input failure modes, runtime context conflict
  semantics, and runner bootstrap behavior;
- a verified `pnpm verify` path for the current workspace, with root
  `pnpm test` running each app, package, Runner, and Host suite through a
  bounded root runner that invokes package-equivalent Vitest commands directly
  in each workspace, with the Host suite split per test file to avoid a
  multi-file startup stall while keeping the same fixture boundaries; child
  processes use explicit suite and startup-output timeouts plus one
  timeout-only retry because direct suites can pass while an individual Vitest
  child stalls before startup; the previous root aggregate Vitest process was
  removed after it reproduced a no-output stall while the same workspace suites
  completed directly;
- a successful live local relay smoke where a wrapped Entangle message produced
  persisted session, conversation, and turn records under the runner runtime
  root;
- a historical three-product roadmap plus a released R1/L1 local-operator
  baseline. The federated-runtime pivot supersedes the roadmap's product
  identity framing: the product is Entangle, and local is one deployment
  profile.

The specification corpus now has five layers:

- descriptive and conceptual architecture;
- canonical type definitions;
- normative invariants, normalization rules, validation rules, and runtime state machines.
- operational specifications for packaging, graph policy, artifact backends, control-plane behavior, and compatibility.
- product-operational specifications for observability, Studio, the early Local
  runtime profile, and phase quality gates.

The central design direction is now clear:

- graph-native, not orchestrator-only;
- user as node;
- agents as first-class nodes;
- Entangle's local-profile topology should visibly include non-flat organizational
  structure, not only one coordinator with flat subagents;
- Nostr-signed messaging for coordination;
- artifact backends for work;
- wiki memory per node;
- a runner per node;
- Studio as graph-aware user and operator client;
- a separate host control-plane service for node admission and runtime lifecycle.
- headless operation should remain possible through CLI and host-facing surfaces, not only through Studio.
- the project should remain in one monorepo with explicit internal package
  boundaries during the same-machine profile and early product phase.
- relay, git service, and model endpoint configuration should come from a
  deployment-scoped resource catalog, not hardcoded runtime assumptions.
- git-facing principals should be bound explicitly through host-managed
  external principal records, not hidden in package or runner-local config.
- runners should consume a versioned effective runtime context resolved by the
  host, not recompute graph and deployment merges on their own.
- model-provider integration should happen behind an internal engine-adapter
  boundary with deterministic provider-boundary tests where practical, and the
  same-machine deployment profile should make the real control-plane topology
  visible.

## Most important current design conclusions

1. The user is a node in the graph.
2. Nodes are identified globally by Nostr public keys.
3. A portable `AgentPackage` must be separate from a graph-local `NodeInstance`.
4. Edges are first-class and canonical.
5. Messages coordinate work; artifacts carry work.
6. Git should be the first implemented artifact backend.
7. Git credentials must stay separate from the node's Nostr private key, even
   when git-facing attribution is derived from the node identity.
8. Each node must run as a true agent runtime, not as a stateless inference endpoint.
9. Relay, git, and model endpoint resources must be bindable per node or via
   graph defaults rather than hardcoded globally.
10. Host, Studio, CLI, and runner need explicit contracts for API and injected
    runtime context rather than ad hoc coupling.
11. The engine/provider layer must stay behind an adapter boundary, not leak
    provider-native types into the runner contract.
12. The Entangle same-machine profile should preserve the final architecture while restricting active features.

## Immediate next steps

The current implementation-truth audit now lives in
[../references/59-implementation-state-and-delivery-audit.md](../references/59-implementation-state-and-delivery-audit.md).

- complete remote git collaboration on top of the existing local git-backed
  artifact model only where later delivery needs exceed the now-implemented
  locator-specific retrieval path, the resolved git principal secret-delivery
  bindings, the explicit repository-target contract, the host-owned
  provisioning record model, the publication/retrieval-state record model, and
  the new pending source-change candidate records with bounded diff and
  listed-file preview plus review, local source-history state, and first
  runner-owned source-history commit artifact publication with explicit
  non-primary target selection plus multi-target publication retention, bounded
  artifact history/diff/preview inspection, backend-cache history/diff for
  projected git refs, explicit wiki target publication, and shared
  multi-target source-history publication presentation plus runner-owned
  artifact restore exposed through operator surfaces plus runner-owned
  artifact source-change proposal operator and User Client requests plus User
  Client visible source-history publication requests plus target-specific
  source-history/wiki publication visibility checks plus explicit
  runner-owned artifact/source/wiki command completion receipts plus User
  Client and Studio wiki page upsert plus runner-enforced stale-edit detection
  plus single-page wiki patch mode plus projected-preview draft prefill with
  automatic expected-hash population plus User Client source-history reconcile
  plus bounded operator batch requests for multiple existing wiki page-upsert
  commands plus signed runner-owned multi-page wiki patch-set commands plus
  User Client participant JSON requests for visible wiki patch-sets with
  process-smoke proof plus browser queue/request UI plus local wiki draft diff
  preview plus stale-edit conflict receipt summaries in the browser, CLI, and
  fallback Human Interface Runtime plus User Client conflict-base recovery into
  the visible page editor plus React conflict-to-patch draft recovery plus
  approval-response turn correlation plus the first grouped React and fallback
  User Client review queues;
  the next git gaps are richer collaborative wiki merge UI beyond the first
  conflict recovery paths, repository
  lifecycle behavior, and explicit fallback or replication behavior,
  while the next deployment-grade gap is disposable non-dry-run fixtures and
  non-disposable profile upgrade behavior beyond the current explicit
  acknowledgement, running-container guards, and read-only service-volume
  status/maintenance/health surfaces;
- complete CLI parity where it adds real headless operational value;
- continue narrowing the remaining delegated-session gaps now that controlled
  autonomous `task.handoff` emission and runner-local active-conversation
  reconciliation plus host-derived conversation lifecycle diagnostics,
  consistency findings, read-only participant runtime status, and first
  owner-aware, coordination-map, and deterministic approval/delegation-ledger
  memory projection are implemented;
- deepen the bootstrap host operator-token boundary, multi-token request audit,
  status reporting, server-filterable event inspection, route-level bootstrap
  permissions, coarse read-only `viewer` enforcement, bootstrap token expiry,
  Host event hash-chain
  tamper evidence, typed audit-bundle export, and CLI file handoff into real
  production identity, authorization, and external audit retention only through
  explicit contracts, tests, policy decisions, enforced roles, and
  operator-visible attribution;
- continue broadening normalized provider metadata and bounded failure
  reporting only where later provider adapters justify new canonical fields,
  and otherwise deepen model-guided memory maintenance on top of the now
  stronger session-aware, artifact-aware/artifact-carrying,
  engine-outcome-aware, execution-insight-carrying, source-change-aware, and
  resolution-aware
  bounded runtime inspection surface plus deterministic source-change,
  approval, and delegation ledgers;
- keep later CLI widening focused only on real operational leverage, not
  surface parity for its own sake;
- keep Studio host-first as it deepens, so richer operator flows continue to
  consume host-owned truth instead of inventing client-side control logic.

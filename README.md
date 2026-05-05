# Entangle

Entangle is a graph-native environment for composing, governing, and running modular AI organizations.

This repository is the active design-and-implementation monorepo for Entangle.
The design corpus remains deliberately deep, but the repository is no longer in
a pre-implementation state: real host, runner, transport, artifact, and local
deployment slices are already in place, and the remaining work is concentrated
in the highest-value runtime capabilities rather than in foundational
architecture discovery.

## Repository Layout

- `apps/`
  User-facing surfaces. The first scaffold includes `studio/` for the visual
  operator experience, `user-client/` for the human graph participant client,
  and `cli/` for thin headless operation.
- `services/`
  Long-running runtime components. The first scaffold includes `host/` and
  `runner/`.
- `packages/`
  Shared internal packages. The first scaffold includes `types/`, `validator/`,
  `host-client/`, `agent-engine/`, and `package-scaffold/`.
- `examples/`
  Canonical example graphs and packages. The active Federated Preview assets
  live under `examples/federated-preview/`.
- `deploy/`
  Deployment profiles. The current same-machine profile is `deploy/federated-dev/`;
  future remote or managed deployment material should be added only when the
  roadmap reaches those gates.
- `releases/`
  Release-control packets organized by deployment milestone. These point back
  to the canonical roadmap and ledgers instead of duplicating specification
  truth.
- `resources/`
  External reference repositories and a manifest of the research corpus. This directory holds local clones of the primary systems, protocols, and engines studied while designing Entangle.
- `references/`
  High-detail product, architecture, protocol, runtime, and roadmap documents. These files are the canonical narrative and technical specification corpus for the project.
- `wiki/`
  A project-specific persistent wiki adapted from the LLM Wiki pattern. This is the operational memory for ongoing design, research ingestion, decision capture, and future implementation tracking.

## Project Thesis

Today's mainstream agentic experience is still structurally narrow. A user speaks to one primary orchestrator, which may internally delegate to subagents. That model is useful, but it hides topology, governance, delegation rules, execution ownership, and collaboration substrate.

Entangle generalizes that model into an explicit graph:

- the user is a first-class node;
- every agent is a first-class node;
- edges define permitted relationships, transport rules, and authority structure;
- messages coordinate work;
- artifacts carry work;
- a session activates a runtime subgraph over a static topology.

The system is not just a chat application with agents behind it. It is a graph-native runtime for AI organizations.

## Same-Machine Profile Scope Principle

Entangle's same-machine deployment profile should not be architecturally simplified
for short-term delivery. The correct rule is:

> Keep the final architecture. Reduce only the active feature surface and the number of active components.

That means:

- stable types now;
- restricted execution profile for the same-machine deployment profile while the
  product matures;
- no deliberate shortcuts that would invalidate later features such as remote node attachment, richer transport policies, multi-relay operation, or stronger governance.

## Fast Functional Smoke

The quickest no-LLM verification path starts the federated dev relay and runs
the process runner smoke:

```bash
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d strfry
pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777
```

For an interactive operator/User Node demo, run:

```bash
pnpm ops:demo-user-node-runtime
```

The demo keeps Host and all joined runners alive, prints the running User
Client URLs, and prints a ready Studio command with the ephemeral Host URL and
operator token. Host CORS is explicitly allow-listed for Studio development
origins through `ENTANGLE_HOST_CORS_ORIGINS`.

That smoke starts Host, one real joined agent runner process, and two real
joined User Node runner processes with separate state roots. It assigns the
agent node and both User Nodes through signed control events, verifies that
each User Node `human_interface` runtime exposes a User Client endpoint, checks
User Client health and state routes, observes runtime state through signed
runner observations, verifies completed lifecycle command receipt projection,
publishes signed User Node messages through the relay, and
verifies that the assigned agent runner persisted both received conversations
and that Host projection contains both User Node conversations from
runner-signed observations. It also verifies the per-assignment timeline read
model over real runner acceptance, lifecycle receipt, and runtime command
receipt evidence. It publishes a synthetic signed agent-to-user message
through the relay and verifies that the running User Node records it as
inbound inbox history, uses the running User Client JSON API for selected
conversation inspection, then submits signed source-candidate review and
approval response messages through the same JSON User Client API. It also loads
the source-change diff and changed-file preview through the running User Client
before review. It now requires signer pubkey audit metadata to survive those
User Node publish, Host inbox, User Client conversation, source review,
approval response, synthetic agent-to-user, and second-User-Node paths. The fake
OpenCode executable mutates the source workspace, so the smoke also verifies
projected source-change candidate list/detail/diff/file reads and delivers the
published source-history git artifact to the User Node before verifying
artifact history/diff through the running User Client. It requests
runner-owned artifact restore for that source-history artifact and verifies
projected retrieval evidence plus the correlated signed command receipt,
requests a runner-owned artifact source-change proposal from the published
report artifact and verifies the pending candidate projection plus the
correlated signed command receipt, then requests explicit non-primary
source-history target publication and verifies the sibling source repository
branch head plus command receipt. The running User Client can also request
runner-owned wiki publication for wiki resources visible in the selected User
Node conversation; that participant path is routed through the Human Interface
Runtime and Host control boundary with `requestedBy` set to the User Node id,
and the smoke verifies the resulting projected command receipt. The same
participant path now also verifies User Client wiki page replacement and
single-page patch requests through runner-signed command receipt hashes and
projected patched wiki preview content. Target-specific
wiki publication requests from the User Client must match the
`wiki_repository_publication` resource visible in the selected User Node
conversation; the smoke also verifies the projected target-specific wiki
artifact and the requested git repository branch head for that participant
path. The same smoke now also asks the running User Client to request artifact
restore for the visible source-history artifact, publishes a signed
source-history approval request to the User Node, asks the running User Client
to request source-history publication for that visible resource, and verifies
both projected command receipts. Target-specific source-history publication
requests from the User Client must match the `source_history_publication`
resource visible in the selected User Node conversation. The running User
Client can also request source-history reconcile for visible plain
`source_history` resources; publication-target resources are not accepted for
reconcile because reconcile can mutate the runner-owned source workspace, and
the smoke verifies that participant path through a completed projected command
receipt. User Client approval responses now also preserve the originating turn
id from the inbound approval request, keeping signed human decisions attached
to the agent turn they answer. Runtime command receipts now carry optional
`requestedBy` attribution, so the running User Client can show only command
receipts requested by its own User Node while `entangle user-nodes
command-receipts <nodeId>` provides the same headless participant view. Both
participant surfaces read Host's scoped
`/v1/user-nodes/:nodeId/command-receipts` route, while operator surfaces retain
the full Host projection. The running User Client state also shows its own
Host-projected `human_interface` runtime assignment, runner, desired/observed
state, last-seen timestamp, projected client URL, restart generation, and
status message. The headless `entangle user-nodes clients` roster now also
adds per-User-Node conversation, unread, pending approval, latest message, and
participant-command receipt counts. Studio's User Node roster shows the same
participant-command receipt and failed receipt counts next to its existing
conversation and Human Interface Runtime placement summary.
The running React User Client also shows a compact participant Workload panel
for conversations, open work, unread messages, unique pending approvals,
pending source reviews, command receipt statuses, source-history/wiki refs,
and reachable targets.
The Human Interface Runtime fallback HTML client renders the same workload
categories when the React bundle is not available.
The smoke still runs without live model credentials. Live OpenCode
behavior and real-provider credentials remain manual/operator validation, but
the fake OpenCode path now proves same-session `--session` continuity through a
second User Node task and Host-projected engine outcome; the OpenAI-compatible
agent-engine HTTP boundary is now covered by a deterministic local provider
fixture.

For stronger no-credential coverage of the attached OpenCode server path, run
the same smoke with the fake attached server profile:

```bash
pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000 --use-fake-opencode-server
```

The same proof is also available as a shorter root command:

```bash
pnpm ops:smoke-federated-process-runner:fake-opencode
```

That mode starts the deterministic fake OpenCode HTTP/SSE server, configures it
as the builder node's default `opencode_server` profile, approves OpenCode
permission requests through the running User Client as the assigned User Node,
verifies source workspace mutation, and proves attached-server session
continuity without live model credentials. The attached-server permission
bridge is also abort-aware while waiting for Entangle approval callbacks, so a
cancelled session does not leave a node turn stuck on a stale permission wait.

For manual no-credential provider plumbing tests, start the deterministic
OpenAI-compatible development server:

```bash
pnpm ops:fake-openai-provider -- --port 18080 --api-key entangle-test-key
```

It serves `/v1/models`, `/v1/chat/completions`, and `/v1/responses` with
deterministic responses and bearer-token validation. Point an
`openai_compatible` model endpoint at `http://127.0.0.1:18080/v1` and store
`entangle-test-key` under the endpoint's `secretRef` when you want to validate
catalog, auth, adapter, and UI wiring without live model credentials. This does
not validate real model behavior.

The provider harness has its own no-credential smoke:

```bash
pnpm ops:smoke-fake-openai-provider
```

That smoke starts the fake provider on an ephemeral port and verifies health,
model listing, non-streaming chat completions, streaming chat completions, and
streaming Responses API frames.

For manual attached OpenCode permission-bridge plumbing tests without real
model credentials, start the deterministic fake OpenCode server:

```bash
pnpm ops:fake-opencode-server -- --port 18081 --username entangle --password server-secret
```

It serves `/global/health`, `/event`, `/session`,
`/session/:sessionID/prompt_async`, and `/permission/:requestID/reply` with a
deterministic permission request and completion event. Point an
`opencode_server` engine profile at `http://127.0.0.1:18081`, configure
`permissionMode: "entangle_approval"`, and set
`OPENCODE_SERVER_USERNAME=entangle` plus
`OPENCODE_SERVER_PASSWORD=server-secret` in the runner environment when you
want to validate the attached-server route wiring without a live provider.
This does not validate real OpenCode model behavior.

With a Host running, the profile can be added to the active catalog without
editing JSON. The command uses Host's focused agent-engine profile upsert route
instead of applying a client-mutated full catalog document:

```bash
pnpm --filter @entangle/cli dev host catalog agent-engine upsert opencode-attached \
  --base-url http://127.0.0.1:18081 \
  --permission-mode entangle_approval \
  --set-default \
  --summary

pnpm --filter @entangle/cli dev host catalog agent-engine list --summary
```

Then bind any agent node to that profile through the same Host boundary:

```bash
pnpm --filter @entangle/cli dev host nodes agent-runtime builder \
  --engine-profile-ref opencode-attached \
  --summary
```

The fake OpenCode harness has its own no-credential smoke:

```bash
pnpm ops:smoke-fake-opencode-server
```

That smoke starts the fake OpenCode server on an ephemeral port and verifies
Basic-authenticated health, session creation, SSE permission delivery,
permission reply, deterministic assistant output, optional workspace mutation
through `x-opencode-directory`, and idle status.

For manual custom `external_http` agent-engine plumbing tests without real
model credentials, start the deterministic fake external HTTP engine:

```bash
pnpm ops:fake-agent-engine-http -- --port 18082 --write-file src/fake-external-http-generated.ts
```

Point an `external_http` engine profile at `http://127.0.0.1:18082/turn`:

```bash
pnpm --filter @entangle/cli dev host catalog agent-engine upsert external-http-fake \
  --kind external_http \
  --base-url http://127.0.0.1:18082/turn \
  --set-default \
  --summary
```

The fixture accepts the shared turn payload, returns a deterministic
`AgentEngineTurnResult`, and can write a bounded file inside the runner source
workspace. This validates protocol, catalog, runner-adapter, and workspace
plumbing; it does not validate real model behavior.

The fake external HTTP engine has its own no-credential smoke:

```bash
pnpm ops:smoke-fake-agent-engine-http
```

That smoke starts the endpoint on an ephemeral port and verifies health, turn
execution, response shape, optional workspace mutation, and debug state.

The same fake engine can now run inside the full federated process smoke:

```bash
pnpm ops:smoke-federated-process-runner:fake-external-http
```

That mode starts Host, one `external_http` agent runner, two User Node runners,
the fake external HTTP endpoint, and the same User Client/source/artifact/wiki
verification path used by the OpenCode smoke. It proves the generic custom
engine boundary through real runner assignment and signed Host projection
without live model credentials.

Active product naming is also guarded:

```bash
pnpm ops:check-product-naming
```

That check scans active code, deployment, example, script, package, and README
surfaces so obsolete local product/profile labels do not return.

The root test gate uses an aggregate Vitest run plus isolated service suites:

```bash
pnpm test
```

It runs Vitest directly from the repository root with
`vitest.aggregate.config.ts` instead of routing tests through Turbo, chained
`pnpm --filter` execution, nested wrappers, or repeated Vitest child processes,
because those paths reproduced intermittent no-output hangs in this
environment. The aggregate config covers workspace `src/**/*.test.ts` files
under `apps` and `packages`; Host and Runner service tests then run through
their package-level scripts so their service-local fixtures keep their
existing isolated process boundaries. The aggregate segment uses a single fork
worker (`--pool=forks --maxWorkers=1`) for predictable local completion, and
the Runner service script now uses the same single-fork stability profile after
the previous threads setting reproduced a no-output hang.

For manual API-backed testing, add `--keep-running`. The smoke keeps Host and
all joined runner processes alive, keeps their temporary state roots, prints
both User Client URLs, and prints CLI commands for publishing a signed
`task.request` to the assigned builder node and inspecting the User Node inbox
projection plus runner turn events. If `apps/user-client/dist` exists, or if
`--user-client-static-dir <path>` is passed, the smoke serves and validates the
dedicated User Client app from the running User Node runtime. Outside the
smoke, `entangle user-nodes clients --summary` lists active User Nodes with
their projected Human Interface Runtime placement and browser-openable User
Client URLs.

The shortest interactive no-credential User Node runtime demo wraps that path:

```bash
pnpm ops:demo-user-node-runtime
```

It builds the dedicated User Client app, starts the development relay, runs the
process-runner smoke in `--keep-running` mode, and prints the Host URL,
operator token, and both User Client URLs. Stop it with `Ctrl-C` in the demo
terminal.

To run the interactive demo with the attached fake OpenCode server profile
instead of the temporary fake executable, use:

```bash
pnpm ops:demo-user-node-runtime:fake-opencode
```

That command keeps the same Host, runner, relay, and User Client path, but uses
the deterministic attached OpenCode fixture so the permission bridge and
attached-session continuity can be exercised without live model credentials.

To run the interactive demo through the generic fake `external_http` engine
profile, use:

```bash
pnpm ops:demo-user-node-runtime:fake-external-http
```

That command keeps the same admin Studio/User Client path while exercising a
custom HTTP agent-engine endpoint under the assigned agent runner.

To prepare a generic runner outside the smoke path, start Host, export a runner
Nostr secret on the runner machine, then generate and use a Host-derived join
config:

```bash
export ENTANGLE_RUNNER_NOSTR_SECRET_KEY="$(openssl rand -hex 32)"
pnpm --filter @entangle/cli dev runners join-config --runner runner-a --output runner-join.json --summary
pnpm --filter @entangle/runner start join --config runner-join.json
```

For a three-runner proof across separate machines, start a reachable Host,
relay, and git backend, then generate a copyable proof kit:

```bash
ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-kit \
  --host-url http://host.example:7071 \
  --relay-url ws://relay.example:7777 \
  --output .entangle/distributed-proof-kit
```

The kit writes one agent runner directory, two User Node runner directories,
and operator commands for trust, assignment, User Client discovery, signed User
Node task publication, projection inspection, and distributed proof
verification. The agent runner defaults to `opencode_server`; pass
`--agent-engine-kind <kind>` to generate a custom agent-engine capability and a
matching verifier command. Custom runner and graph node ids are also carried
into `operator/proof-profile.json`, which the generated verifier command reads.
The kit validates that profile as a distributed-proof contract before writing
it, and the verifier rejects malformed or internally inconsistent profiles
before inspecting Host state. Generated profiles also carry the primary User
Node conversation and User Client health requirements, so direct `--profile`
verification stays aligned with the generated operator scripts.
For no-credential distributed checks against the attached OpenCode route, pass
`--fake-opencode-server-url <url>`. The generated operator script upserts an
`opencode_server` profile with `permissionMode: "entangle_approval"`, binds the
agent node to that profile, and the generated agent-runner env can carry the
optional fake-server Basic-auth variables. Start `pnpm ops:fake-opencode-server`
on a machine reachable from the agent runner before sending work.
For generic custom-engine checks, pass
`--external-process-engine-executable <cmd>` or
`--external-http-engine-url <url>`. The kit infers the matching active engine
kind when `--agent-engine-kind` is omitted, upserts the profile through Host,
and binds the agent node before assignment. For no-credential `external_http`
proof setup, start `pnpm ops:fake-agent-engine-http` on a machine reachable
from the agent runner and pass its `/turn` URL.
Pass `--check-relay-health` with at least one `--relay-url` when the generated
operator command should also probe relay WebSocket reachability from the
operator machine.
Pass `--require-external-user-client-urls` when a physical multi-machine proof
should reject projected User Client URLs on `localhost`, loopback, or wildcard
addresses.
Pass `--require-user-client-basic-auth` when generated User Node runner
directories should require `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH` before their
User Clients start. Use `--user-client-basic-auth-env-var <envVar>` if the
operator machines should source the placeholder from a different environment
variable. Generated `start.sh` scripts fail fast until the placeholder is
replaced with `username:password`.
Operators can also inspect and probe projected User Client endpoints from the
Host-facing CLI:

```bash
pnpm --filter @entangle/cli dev user-nodes clients --summary --check-health
```

The health probe reads Host projection for the endpoint list, then checks each
User Client `/health` endpoint from the CLI machine and reports success or
failure in `clientHealth`. Each probe is bounded by a default 3000ms timeout;
use `--health-timeout-ms <ms>` for slower remote links.
Copy runner directories to machines with Entangle checkouts; the proof is valid
only when the runners do not rely on Host filesystem access and report running
runtime observations, expected runtime-kind capabilities, expected
agent-engine capabilities, and distinct User Client URLs back to Host
projection. With the external-URL requirement enabled, those User Client URLs
must also be reachable as non-loopback HTTP endpoints from the operator
machine.

After the runner directories are running and assignments have been offered, the
operator machine can verify the proof through Host and User Client HTTP
surfaces only:

```bash
ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-verify \
  --host-url http://host.example:7071 \
  --profile .entangle/distributed-proof-kit/operator/proof-profile.json
```

The verifier defaults the expected agent engine to `opencode_server`; custom
proof profiles can pass `--agent-engine-kind <kind>` when the agent runner is
intentionally configured for another engine adapter.
When a proof profile includes explicit `assignments`, the verifier uses those
manifest assignment ids instead of deriving `assignment-${runnerId}`.
Pass `--junit <file>` to write the same check set as a JUnit XML report for CI
or support retention.
After the agent has produced projected work evidence, rerun the verifier with
`--require-artifact-evidence --require-published-git-artifact` to require at
least one projected work ref plus published git artifact/source-history
evidence from the agent node.
Generated kits also include `operator/verify-topology.sh` for repeatable
topology verification and `operator/verify-artifacts.sh` for the stricter
post-work check. The post-work script uses
`operator/proof-profile-post-work.json` and requires both projected work
evidence and a published git artifact or source-history publication from the
agent node.
Set `ENTANGLE_PROOF_JUNIT_DIR` before running either generated verifier script
to persist JUnit XML reports as `topology.xml` and `artifacts.xml`.
Generated `operator/commands.sh` also runs
`user-nodes clients --summary --check-health` before publishing the scripted
User Node task, so the operator sees User Client reachability from the operator
machine during the manual proof flow. CLI health probes serialize timeout
failures into `clientHealth` and do not mutate Host or runner state.
For real multi-machine network checks, add `--check-relay-health`; the verifier
uses relay URLs from `--relay-url` or the generated proof profile.
Add `--check-git-backend-health` to require the Host catalog's selected or
default git service to be present, non-file-backed, and reachable at its public
`baseUrl`. Pass `--git-service-ref <id>` to verify a specific git service.
Generate the kit with `--check-published-git-ref` when the operator machine
should also run `git ls-remote` against projected post-work git artifact refs.

CI can verify the proof tooling itself without provisioning external machines:

```bash
pnpm ops:smoke-distributed-proof-tools
```

That smoke checks proof-kit syntax/help/dry-run paths and verifier self-test
JSON, including the default failure path for non-running runtime observations.
It also checks that duplicated User Client URLs and wrong runner runtime-kind
or agent-engine capabilities fail the multi-user proof, that verifier JUnit
output is written, that generated proof-kit verifier scripts expose optional
JUnit report paths, that malformed proof
profiles fail before Host inspection, and that missing artifact evidence,
missing relay URLs, file-backed git services, or missing git service refs fail
when explicitly required. It also checks loopback User Client URL rejection
when physical proof mode requests external URLs, generated User Client Basic
Auth placeholders for User Node runner machines, custom assignment ids from
proof profiles, and the generated post-work artifact verifier command. It does
not replace the real distributed proof above.

Managed Docker runners in the federated dev profile use the same join path.
The Host passes inline join config JSON to the runner container and the runner
fetches its portable bootstrap bundle from the Host API instead of mounting
Host state just to read `runner-join.json`.

## Current Status

This repository currently contains:

- a detailed design corpus;
- an operational wiki schema and initial pages;
- a locally materialized reference corpus under `resources/`;
- a concrete implementation stack direction centered on TypeScript, Node 22,
  `pnpm`, Turborepo, `nostr-tools`, `strfry`, `Gitea`, and Docker Compose;
- an initial monorepo scaffold for `apps/`, `services/`, `packages/`, and
  `deploy/`;
- the first machine-readable contract layer in `packages/types`, now extended
  with Entangle A2A payloads and runner-local lifecycle state contracts;
- a stronger validator surface with resource-resolution and transport
  realizability checks;
- a host control-plane surface with persistent catalog, package-source, and
  graph state under `.entangle/host`;
- an optional bootstrap host operator-token boundary through
  `ENTANGLE_HOST_OPERATOR_TOKEN` or multiple records in
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`; multi-operator records may carry raw
  `token` values or `tokenSha256` hashes and may opt into explicit
  route-level Host permissions, with bearer-token propagation through the
  shared host client, CLI, and Studio for same-machine profiles that should not
  expose an open mutation surface, plus typed `security` audit events for
  protected mutation requests through `host.operator_request.completed`, and
  Host status reporting of the active bootstrap operator security posture
  without exposing token material; token-protected Hosts now enforce the
  bootstrap `viewer` role as read-only, include `operatorRole` in protected
  mutation audit events, and can attribute requests to distinct bootstrap
  operator tokens and scoped permissions; host-client and CLI event summaries
  now render those audit events with operator id, role, method, path, status,
  and auth mode, and Host
  event listing now applies audit filters server-side before limit slicing;
- host-managed external principal records for backend-facing identities such as
  git principals, exposed through the same host boundary, safely removable
  when unused, and resolved into effective runtime context rather than
  hardcoded into packages;
- runtime materialization under `.entangle/host` for desired bindings,
  runtime intents, observed runtime records, an immutable package store,
  workspaces, and injected runtime context;
- a runtime-backend abstraction with a tested memory backend, a first Docker
  backend driven by a first-party Docker Engine API client, and persisted
  reconciliation snapshots under observed host state;
- host-owned stable per-node Nostr runtime identities with non-secret identity
  context injected into runners and a separate local secret storage profile;
- stable User Node identities that can be assigned to `human_interface`
  runners, portable User Node bootstrap bundles, a runner-served Human
  Interface Runtime/User Client with `/health`, `/api/state`, projected
  conversation list, selected-thread metadata, recorded inbound/outbound message
  history with signer pubkey audit metadata when available, User Client
  approval controls, approval resource rendering,
  signed approval-response context, approval record request/response lineage
  metadata, signer/fromPubkey enforcement for runner A2A envelopes,
  signer audit labels in compact CLI/User Client message surfaces,
  process-smoke signer audit coverage for the User Node publish, conversation,
  source-review, approval-response, inbound agent-message, and second-User-Node
  paths,
  approver-set enforcement before approval state transitions,
  projected source-change summary rendering, projected source-change diff
  excerpt rendering, source-change diff/file fallback scoped to visible
  approval conversations, signed source-candidate accept/reject messages
  handled by the owning runner,
  artifact-ref rendering, projected bounded artifact preview with runtime
  fallback, delivery labels, local conversation read
  state, projected wiki-ref rendering, projected wiki preview rendering,
  signed read receipts, parent-message links, delivery retry state, runtime
  identity/relay/Host API status, lightweight live state refresh, local JSON
  APIs for selected conversation detail, conversation read state, and message
  publishing, and Host-backed message publishing,
  plus a first dedicated `apps/user-client` app that consumes those runtime
  JSON APIs and can be served by the Human Interface Runtime from
  `ENTANGLE_USER_CLIENT_STATIC_DIR`, with the federated dev runner image now
  bundling that built app by default and the Docker launcher now able to publish
  a browser-openable User Client port for User Node runtime contexts, with
  optional runtime-local Basic Auth available through
  `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password`, and with
  the dedicated app now using runtime-local JSON routes for artifact preview,
  source diff, source file preview, source-candidate review, wiki preview
  cards, and automatic thread read-state convergence, with source and artifact
  evidence scoped to selected User Node conversations, plus
  projection of the User Client endpoint through Host, CLI, and Studio, with
  Host runtime synchronization retaining observed User Node runtime endpoints,
  including `entangle user-nodes clients` for User Node-focused endpoint
  discovery,
  with CLI signed approve/reject and generic User Node message
  commands able to
  carry scoped approval-response operation/resource/reason context, and CLI
  approve/reject commands able to derive that context directly from
  Host-recorded inbound approval-request messages through direct User Node
  message lookup;
- peer-identity-aware runtime edge routes where host-resolved non-user peer
  Nostr public keys are injected as non-secret route metadata, and runner turn
  requests now receive a bounded peer-route summary for controlled
  multi-node reasoning without inventing destinations;
- controlled autonomous runner handoffs where structured engine
  `handoffDirectives` are validated against local autonomy policy, effective
  edge routes, peer pubkeys, and allowed edge relations before emitting
  `task.handoff`, with emitted handoff message ids preserved on runner turns,
  host activity events, and shared runtime-turn presentation, plus
  runner-owned active-conversation reconciliation so multi-handoff sessions
  remain active until every open delegated conversation resolves or closes,
  with a runner-start repair pass that realigns stale active-conversation ids
  from durable conversation records, moves still-pending approval-gated drained
  sessions to `waiting_approval`, clears already-approved waiting gates, and
  safely completes drained active or unblocked waiting sessions before new
  transport intake begins;
- host-resolved model credential delivery in the effective runtime context for
  internal provider-backed engine code, with explicit per-profile auth-mode
  selection rather than an unsafe implicit default and with Anthropic local
  defaults now correctly resolving to header-secret authentication;
- a first OpenCode-first per-node agent-runtime contract where deployment
  catalogs carry `agentEngineProfiles`, graph and node bindings carry
  `agentRuntime`, effective runtime context carries the resolved
  `agentRuntimeContext`, defaults point at `opencode-default`, and per-node
  source, engine-state, and wiki-repository workspace roots are materialized,
  with the runner now able to execute the first safe OpenCode CLI/process
  adapter for primary node turns while isolating OpenCode DB/config/XDG state
  under the node engine-state workspace, probing OpenCode version before turns,
  probing attached OpenCode server health/version before `--attach` turns when
  an engine profile provides `baseUrl`, applying bounded probe/run process
  timeouts, and carrying generic
  engine-session ids, engine versions, and permission-block observations on
  persisted turn outcomes, including `policy_denied` results when OpenCode
  one-shot CLI auto-rejects a permission request, with engine profiles now
  carrying explicit `permissionMode` configuration so operators can opt an
  OpenCode node into `auto_approve` when runner sandboxing and Entangle review
  policy make that acceptable, or into `entangle_approval` for attached
  OpenCode server profiles where runner-side permission requests are bridged
  through signed Entangle approval messages before the adapter replies to
  OpenCode, with Host runtime inspection, CLI summaries, and Studio's runtime
  inspector showing the resolved permission mode, plus
  bounded generic tool evidence from
  OpenCode JSON events, including tool titles, redacted input
  summaries, output summaries, durations, and call ids, plus adapter-local
  OpenCode session continuity for later turns in the same Entangle session,
  with the federated dev
  runner image now installing pinned `opencode-ai@1.14.20` and verifying
  `opencode --version` during image build, and with host runtime inspection
  exposing a generic agent-runtime summary for effective mode, engine profile,
  state scope, last engine version/session, last permission decision, last turn,
  bounded failure evidence, and generic workspace-health status for
  source/artifact/engine-state/wiki surfaces through the shared host-client,
  CLI, and Studio surfaces, and with a minimal `external_process` adapter that
  starts a configured executable, sends an `AgentEngineTurnRequest` JSON
  payload on stdin, validates an `AgentEngineTurnResult` JSON object from
  stdout, and keeps custom engines behind the same runner turn contract as
  OpenCode. Shared catalog validation now requires `external_process` profiles
  to declare an executable. The runner also executes `external_http` profiles
  by POSTing the same turn payload to the configured endpoint and validating the
  shared turn result response. Unsupported native engine placeholders are not
  exposed as active profile kinds until a runner adapter exists, with
  runner-owned source workspace change
  harvesting now recording bounded changed-file and diff summaries on turns,
  host events, runtime inspection, CLI output, and Studio details, plus
  durable pending source-change candidate records with host, CLI, and Studio
  inspection plus bounded candidate diff, listed-file previews, and audited
  review lifecycle now driven publicly by signed User Node
  `source_change.review` messages for accepted/rejected decisions, and
  runner-owned source-history application for accepted candidates that
  validates the current source tree before recording a local history commit,
  with runner-owned source-history publication that materializes an accepted
  source-history commit as a git commit artifact, records publication metadata,
  and pushes through a runner-resolved git target when policy allows it,
  defaulting to the node's primary git target for automatic publication, while
  explicit operator publish/retry requests now travel as Host-signed
  `runtime.source_history.publish` commands to the accepted runner assignment
  and can carry an approval id plus explicit git target selectors for
  policy-gated non-primary repository publication, with retained per-target
  publication records now visible through shared CLI and Studio source-history
  presentation. Artifact restore requests now travel as Host-signed
  `runtime.artifact.restore` commands to the accepted runner assignment; the
  runner retrieves the projected artifact ref into runner-owned state and emits
  signed `artifact.ref` retrieval evidence plus `runtime.command.receipt`
  completion rather than Host reading runner files, with CLI and Studio
  exposing that request path from artifact inspection surfaces.
  Artifact-to-source proposal requests now travel as
  Host-signed `runtime.artifact.propose_source_change` commands; the runner
  retrieves the artifact, copies bounded safe content into its source
  workspace, and emits a pending source-change candidate for normal review.
  The joined runner also emits explicit signed `runtime.command.receipt`
  observations for lifecycle start/stop/restart, session cancellation,
  artifact restore, artifact proposal, source-history publish/replay, and wiki
  publication received/completed/failed states, and Host projection correlates
  the command id with result ids such as cancellation/session id, effective
  proposal id, source-change candidate id, source-history id, restore id, or
  wiki artifact id.
  Explicit operator replay requests now travel as Host-signed
  `runtime.source_history.replay` commands to the accepted runner assignment
  instead of Host-side filesystem mutations, with both CLI and Studio source
  history detail using that Host request path and with observed
  `source_history.replayed` outcomes now projected through Host API,
  host-client, CLI replay inspection commands, and Studio federation summary
  counts. Diverged but cleanly mergeable source workspaces can now use the
  sibling Host-signed `runtime.source_history.reconcile` command; the runner
  applies the same source-application approval policy, performs a Git
  three-way tree merge, records successful merges as `merged` replay records
  with `mergedTree`, and reports conflicts as `unavailable`. Node-configured source mutation
  policy is still able to require approved runtime
  approval ids before source application or source publication, and with
  accepted approval ids persisted on source records after validating approval
  operation and concrete resource scope, plus signed User Node
  approval-response commands and User
  Client controls for participant approval decisions, plus runner-emitted
  `artifact.ref`, `source_change.ref`, `source_history.ref`, and `wiki.ref`
  observations during normal turns and accepted source reviews so Host
  projection receives portable work refs, bounded source-change summaries, and
  concrete source-history records through the observe protocol, with the runner
  also publishing accepted source-history records to the node's primary git
  target when policy allows it or when it receives an explicit federated
  source-history publish/retry command, plus replay outcome records from
  `source_history.replayed` observations, plus runner-owned local git snapshots of
  `memory/wiki` into each node's
  `wiki-repository` workspace after completed turns, with durable sync outcomes
  carried through runner turns, host events, CLI output, and Studio turn
  inspection, and with `entangle deployment doctor`
  now warning on uninitialized, dirty, or uncommitted runtime wiki
  repositories. Direct Host-mediated wiki-repository publication has been
  removed because it required Host-readable runner filesystem state; explicit
  wiki publication now returns through a Host-signed `runtime.wiki.publish`
  control command that the accepted runner executes from runner-owned wiki
  state, with CLI and Studio requesting that same Host control path, publishing
  to the primary git target by default or to an explicit resolved git target
  selector and emitting `artifact.ref` projection evidence, now covered in the
  process-boundary smoke by checking the projected artifact ref and matching
  primary git branch head. Runner-owned wiki page replacement/append now uses
  the sibling Host-signed `runtime.wiki.upsert_page` command: the accepted
  runner validates markdown page paths inside its own `memory/wiki` root,
  writes the page, updates the wiki index, synchronizes the wiki git
  repository, emits `wiki.ref` evidence, and reports command receipts
  correlated by `wikiPagePath`; Host API, host-client, and CLI expose that
  mutation path without Host writing runner files. The running User Client can
  now request the same mutation path for visible `wiki_page` resources in the
  selected User Node conversation, with the Human Interface Runtime forwarding
  through Host as the User Node. Studio's Runtime Memory panel now exposes the
  same Host control path for operators. Wiki page upsert can now carry an
  optional `expectedCurrentSha256` digest; the runner compares it against
  current runner-owned page content before writing, and command receipts can
  expose expected, previous, and next page hashes for stale-edit audit. The
  same command now supports `mode: "patch"` for single-page unified diffs that
  the runner applies only when context/removal lines match current content.
  The running User Client can also load a complete projected wiki preview into
  the participant page-update form as an edit draft, keeping normal wiki memory
  edits inside the node-local client rather than requiring manual copy/paste
  from projection cards.
  Public deep runtime reads
  for accepted federated
  assignments now ignore Host-local runtime files and use projected
  runner evidence instead, while non-federated adapter reads remain available.
  Bounded engine-request
  summaries on executable turns so
  operators can inspect prompt part counts, aggregate prompt size, memory,
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
  Host-signed `runtime.session.cancel` control command to accepted federated
  runner assignments and rejected when no accepted federated assignment/control
  path is available, exposed through host-client and CLI `sessions cancel`
  surfaces plus Studio selected-session controls, applied by the long-lived
  runner while idle or mid-turn, translated into engine `AbortSignal`
  cancellation for OpenCode processes, and recorded as cancelled session/turn
  lifecycle evidence rather than generic failure, and with generic
  runtime inspection now surfacing pending
  approval blockers plus the latest produced artifact and requested approval
  ids through the shared host/CLI/Studio boundary;
- a host client, package scaffold utility, runtime-aware CLI, and Studio
  surface that now consume real host state instead of a fake graph;
- Host status now carries Host-owned federated control/observe transport
  health, including configured relay URLs, subscribed/degraded/stopped
  lifecycle state, and last startup failure metadata, with shared host-client,
  CLI, and Studio rendering, and now also reports bounded derived artifact
  backend cache availability, repository count, and size without exposing Host
  filesystem paths; operators can dry-run, clear, or age-prune that derived
  cache through the Host API and CLI without deleting authoritative
  artifact/projection state, and Studio renders the cache summary in the Host
  Status panel;
- CLI can generate schema-validated generic runner join configs from Host
  status through `entangle runners join-config`, while the runner package now
  exposes an `entangle-runner` bin for `join --config` startup, including an
  optional validated heartbeat interval;
- generic joined runners emit periodic signed `runner.heartbeat` observations
  with accepted assignment ids and capacity-derived operational state, so Host
  projection can track remote runner liveness after startup, and the
  process-runner smoke now validates those projected heartbeats from real
  joined runner processes;
- the Docker launcher adapter can now deliver runner join config as inline JSON
  env, and the federated dev Compose profile launches managed Docker runners in
  join mode with Host API bundle retrieval instead of path-mounted join config
  delivery; Docker join bootstrap is now the launcher default, while direct
  runtime-context startup is explicit compatibility/debug behavior; runner
  process startup also now fails fast unless `join`, join config env, or an
  explicit runtime-context path is provided;
- observed activity projection now preserves signed remote session activity
  during same-workstation compatibility synchronization, and Host session
  listing plus bounded session detail can surface projected remote sessions
  without a Host-readable runner session file;
- runner-owned approval lifecycle changes now emit signed `approval.updated`
  observations with bounded approval records, feeding Host approval activity
  projection and approval list/detail reads without relying only on runner-local
  approval files;
- runner turn read APIs can now list and inspect observed `turn.updated`
  projection records without relying only on runner-local turn files;
- runtime artifact list/detail APIs can now list and inspect observed
  `artifact.ref` projection records without requiring Host-readable
  runner-local artifact files;
- runtime artifact preview APIs can now serve bounded projected
  `artifact.ref` preview content without exposing a runner-local source path;
- source-change candidate list/detail APIs can now list and inspect projected
  full candidate records carried by `source_change.ref` observations without
  requiring Host-readable runner-local candidate files;
- source-change candidate diff APIs can now fall back to bounded projected
  `diffExcerpt` evidence when runner-local shadow git state is unavailable;
- source-change candidate file preview APIs can now fall back to bounded
  projected text previews carried by the observed source-change summary;
- runtime memory list/page APIs can now fall back to observed `wiki.ref`
  projection records and bounded wiki previews when Host cannot read the
  runner's memory root, and memory list returns an empty projection-backed
  view for active graph nodes before any wiki refs are observed;
- artifact history/diff APIs can now resolve projected git artifact locators
  through a Host-owned backend cache when semantic artifact context identifies
  a reachable git backend, and otherwise return projected artifact records with
  explicit unavailable reasons; the running User Client can request the same
  bounded artifact history/diff evidence through its Human Interface Runtime
  when the artifact ref is visible in the selected User Node conversation;
- the process-runner smoke now verifies backend-cache history/diff for a
  runner-published source-history git artifact and verifies the same
  visible-artifact history/diff path through the running User Client;
- Host status now surfaces the derived artifact backend cache's availability,
  repository count, and byte size for operator diagnostics while keeping that
  cache rebuildable implementation state; the Host API and CLI can dry-run,
  clear, age-prune, max-size-prune, or target-prune by git
  service/namespace/repository when operators need to reclaim space or refresh
  stale backend clones;
- Host status also surfaces bootstrap operator security mode, normalized
  operator id and role for a single `ENTANGLE_HOST_OPERATOR_TOKEN`, or a
  tokenless list of operator ids and roles for
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`; scoped tokens additionally report
  their explicit Host permissions, while tokenless development reports that no
  operator auth mode is active;
- the process-runner smoke now exercises the OpenCode adapter path with a
  temporary deterministic `opencode` executable inside the spawned agent
  runner process, mutates the source workspace, then verifies projected turn,
  source-change candidate list/detail/diff/file, running User Client
  source-change diff/file preview, signed source-candidate review, approval,
  and session read APIs without requiring live
  model-provider credentials;
- joined runners now publish session/conversation observations for later
  lifecycle transitions including handoffs, coordination result/close,
  approval request/response, completion, cancellation, and failure paths;
- assignment timelines now join Host assignment lifecycle state with
  runner-signed receipt projection and assignment-scoped runtime command
  receipt projection, with Host API, host-client, CLI, and Studio grouped
  lifecycle plus command receipt summaries sharing the same read model and
  Studio plus CLI compact projection output listing recent command receipts
  from Host projection, plus a dedicated CLI command receipt list with
  assignment, node, runner, command type, status, requester, and limit filters,
  participant-scoped command receipt visibility in the running User Client and
  User Node CLI through a scoped Host route, read-only User Client visibility
  into its own projected Human Interface Runtime status, and a Studio
  assignment timeline drilldown over the same Host endpoint with related
  navigation to runtime, runner, source-history, and command receipt panels.
  The CLI User Node client roster also reports conversation/unread/approval and
  participant-command receipt counts per User Node, and Studio reports the same
  participant-command receipt counts in its User Node roster;
- a Studio federation overview that joins User Node identities with runtime
  projection and conversation projection, so operators can see Human Interface
  Runtime state, runner placement, User Client links, conversation counts,
  active counts, unread counts, pending approval counts, and first-pass
  runner trust/revoke plus liveness/capability detail and assignment
  offer/revoke/timeline operational detail controls without turning Studio
  into the user chat client;
- a safer package scaffold flow where `entangle package init` exposes package
  name, package id, node kind, and explicit `--force` overwrite controls over
  the shared scaffold utility;
- an explicit package-level tool catalog contract through
  `manifest.runtime.toolsPath` and `runtime/tools.json`, with scaffolds and
  validators now treating empty tool catalogs as explicit package state rather
  than inferred absence;
- runtime-context artifact metadata that now carries resolved git principal
  bindings, including secret-delivery availability and mounted-file delivery
  paths for the current same-machine profile;
- deterministic primary git repository-target resolution in runtime context,
  separating HTTP/API service base URLs from SSH/HTTPS remote transport roots
  and carrying explicit provisioning mode hints for the selected git service;
- a runner transport and intake slice with a deterministic in-memory transport,
  a file-backed runner state store, and a long-lived `RunnerService` that
  validates inbound A2A messages, advances session and conversation lifecycle
  state, builds engine turn requests from inbound context, and emits
  `task.result` replies when response policy requires them, while treating
  non-executable coordination messages such as `task.result` and
  `conversation.close` as state updates rather than fresh engine turns and
  deriving session `activeConversationIds` from open conversation records
  instead of leaving them as append-only history;
- a functional federated smoke path where a real joined runner process starts
  from a generic join config, receives assignment control over a live relay,
  materializes a portable bootstrap bundle under runner-owned state, starts the
  assigned node runtime, emits signed runtime observations, receives a signed
  User Node message over Nostr, persists the resulting session and
  conversation, and projects the User Node conversation through Host without
  requiring a model-provider API call;
- a first git-backed artifact materialization slice in the runner, where each
  completed turn can persist a structured `ArtifactRecord`, write a durable
  report file into a node-local git workspace, commit it, and attach the
  resulting portable artifact reference to outbound `task.result` messages
  without leaking runtime-local filesystem paths into the protocol-facing
  locator, while now also persisting explicit publication-state metadata that
  distinguishes local-only materialization from remote publication outcomes,
  plus a first remote-publication path for deterministic preexisting
  repositories that persists success or failure without corrupting local
  artifact truth, plus a first downstream retrieval path for published
  git-backed handoffs through a runner-local retrieval cache and typed
  retrieval-state records, now widened to locator-specific repository targets
  with deterministic service-scoped transport-principal selection and
  repository-partitioned retrieval caches, plus host-owned provisioning of
  primary `gitea_api` repository targets with persisted provisioning-state
  records and runtime realizability gated on provisioning success, and now
  supports HTTPS-token git transport through a non-persistent `GIT_ASKPASS`
  environment in addition to the existing SSH-key path, with runner-level and
  Docker-backed disposable-profile coverage proving that one node can publish
  a git artifact and a downstream node can retrieve it into local engine
  context from the same remote;
- host read surfaces for persisted runtime artifacts through
  `GET /v1/runtimes/{nodeId}/artifacts` and
  `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`, with bounded preview,
  git history, and git diff inspection for supported materialized artifacts.
  Direct Host restore/promotion mutations have been removed; artifact restore
  now returns as a Host-signed command executed in runner-owned state and
  exposed through CLI/Studio operator surfaces. Artifact-to-source work now
  returns as a runner-owned source-change proposal command exposed through
  CLI/Studio operator surfaces and conversation-scoped User Client artifact
  controls rather than Host writes into runner-local workspaces, and Host
  returns an effective proposal id in every acknowledgement so clients can
  follow the resulting candidate id; Host projection also exposes explicit
  runner-owned artifact/source/wiki command receipts correlated to resulting
  artifact, source-history, proposal, and candidate ids;
- host read surfaces for persisted runner turns through
  `GET /v1/runtimes/{nodeId}/turns` and
  `GET /v1/runtimes/{nodeId}/turns/{turnId}`, plus shared host-client and CLI
  coverage for deeper runtime auditability;
- host read surfaces for persisted runner approval records through
  `GET /v1/runtimes/{nodeId}/approvals` and
  `GET /v1/runtimes/{nodeId}/approvals/{approvalId}`, with shared
  host-client, CLI, and Studio read coverage for approval-gate auditability
  while approval responses are submitted as signed User Node messages;
- a host-owned session inspection surface through `GET /v1/sessions` and
  `GET /v1/sessions/{sessionId}`, aggregating persisted runner session state
  across the current host runtime set and exposing the same boundary through
  `packages/host-client` and the CLI, with list summaries now carrying
  aggregate active-conversation ids, waiting approval ids, root artifact ids,
  host-derived conversation and approval lifecycle status counts, optional
  consistency findings for drift between session active ids and conversation
  records, drift between waiting approval ids and approval records, active
  sessions with no open work, and the latest observed A2A message type across
  participating nodes;
- a widening of the host event surface where `entangle-host` now derives and
  persists `session.updated` plus `runner.turn.updated` events from persisted
  runner session and turn state, with `session.updated` now carrying
  active-conversation ids, conversation and approval lifecycle counts, bounded
  session consistency finding diagnostics, root artifact ids, and last message
  type, and with durable deduplication anchored in observed host state instead
  of transient in-memory delivery state;
- a live Nostr transport adapter for the runner that uses NIP-59 gift wrapping,
  a dedicated Entangle rumor kind, relay-readiness preconnect semantics, and a
  verified local relay smoke where a real wrapped message produces persisted
  session, conversation, and turn state;
- a corrected local `strfry` deployment profile with an explicit mounted config
  file instead of an invalid config-less relay command;
- a hardened local Docker image topology with an explicit `.dockerignore`,
  TypeScript incremental build metadata excluded from Docker contexts,
  explicit clean service builds, pinned `pnpm` installation inside build
  stages, a pinned shared pnpm store path for cache mounts, and a static Nginx
  runtime image for Studio instead of `vite preview`;
- explicit deploy packaging boundaries for host, runner, CLI, and shared
  packages through `files` allowlists and build outputs that exclude compiled
  test files from runtime payloads;
- verified portable deploy payloads for host and runner built from the real
  `build -> deploy` path used by the service images, with image-build
  assertions for service and workspace package `dist/` payloads;
- a documented local operator bootstrap profile under `deploy/`, backed by
  `pnpm ops:check-federated-dev` and `pnpm ops:check-federated-dev:strict` preflight checks
  for toolchain, Docker, Docker Compose, daemon access, and Compose config
  validity;
- an explicit deployment profile layout where active same-machine deployment material
  lives under `deploy/federated-dev/`, with scripts sharing profile paths through
  `scripts/federated-dev-profile-paths.mjs`;
- an explicit release-control area under `releases/`, with the released Local
  L1 operator-baseline packet pointing back to the canonical R1/L1 ledger;
- an active same-machine profile smoke through `pnpm ops:smoke-federated-dev` that checks the
  running Compose services, runner image presence, host JSON APIs, Studio HTTP,
  Gitea HTTP reachability, and the local `strfry` Nostr WebSocket path;
- a same-machine diagnostics smoke through `pnpm ops:smoke-federated-dev:diagnostics` that
  writes a temporary redacted diagnostics bundle against a running
  same-machine profile and validates its stable top-level shape;
- a same-machine reliability smoke through `pnpm ops:smoke-federated-dev:reliability` that
  creates a temporary backup bundle, validates restore dry-run, and verifies
  repair dry-run output against an initialized same-machine profile;
- first same-machine backup/restore commands through `entangle deployment backup` and
  `entangle deployment restore`, using a versioned directory bundle for
  `.entangle/host`, selected same-machine profile config snapshots, explicit secret
  exclusion, and restore-time state-layout compatibility checks;
- a first conservative same-machine repair command through `entangle deployment repair`,
  defaulting to dry-run previews and applying only safe host-state
  initialization, missing layout-marker, or missing standard host-state
  directory repairs when `--apply-safe` is supplied;
- a disposable same-machine profile smoke through `pnpm ops:smoke-federated-dev:disposable`
  that runs strict preflight, builds the runner image, starts the stable
  Compose services, waits for active smoke success, and tears the profile down;
- a process-boundary federated smoke through `pnpm ops:smoke-federated-process-runner`
  that starts a Host HTTP server, launches separate generic joined agent and
  User Node runners as OS processes, assigns nodes through the relay, verifies
  runner-owned materialization, checks two Human Interface Runtime User Client
  endpoints, publishes from the primary User Node through the running User
  Client JSON API, exercises a deterministic OpenCode-adapter task turn,
  verifies projected turn/approval/session read APIs, requests runner-owned
  wiki publication through Host-signed control and verifies the projected git
  artifact plus primary git branch head, then requests explicit non-primary
  wiki target publication and verifies the sibling git branch head, requests
  explicit non-primary source-history target publication and verifies the
  sibling source branch head, publishes from a second distinct User Node
  identity, records a synthetic inbound agent message through the running User
  Node, inspects the selected conversation through the User Client JSON API,
  submits a signed User Node approval response through the same JSON API,
  verifies Host projection, and now protects public deep runtime reads from
  stale Host-local runtime files for accepted federated assignments;
- host package lint now covers TypeScript host smoke scripts, including the
  process-runner smoke that exercises the fastest federated runtime proof;
- an agentic runtime smoke through `pnpm ops:smoke-federated-dev:runtime`
  and `pnpm ops:smoke-federated-dev:disposable:runtime` that uses the current
  process-runner path, assigns joined agent and User Node runners through the
  relay, defaults to a deterministic fake OpenCode attached-server profile,
  bridges signed User Node approvals into engine permissions, verifies
  source/wiki/artifact projection, exercises User Client routes, and avoids
  live model-provider credentials;
- a Federated Preview service demo path through `pnpm ops:demo-federated-preview`
  that starts the Federated dev Compose profile, verifies local services, then
  runs the current agentic runtime smoke against the development relay, with
  `pnpm ops:demo-federated-preview:reset` as the reset path;
- a released L2 Federated Workbench implementation with `entangle package
  inspect`, package tool-catalog validation, `entangle graph diff`,
  root-relative CLI path handling under `pnpm --filter @entangle/cli dev`,
  `entangle host sessions launch` through the host API over host-resolved
  runtime context and the local NIP-59 relay, optional CLI launch wait
  polling through host session inspection, Studio selected-runtime session
  inspection through the same host API, shared graph diffing for CLI and Studio,
  Studio graph revision diff against active graph state, host-backed Studio
  active-graph validation, host graph import/export through the CLI, runtime
  artifact filtering by `--session-id`, bounded local report-artifact preview
  through the host API, CLI, and Studio, runtime memory page inspection and
  bounded preview through the host API, CLI, and Studio, and CLI graph
  template list/export commands for the canonical Federated Preview graph;
- a quality baseline with ESLint, Vitest, GitHub Actions CI, and
  socketless host service tests that keep ordinary verification portable in
  constrained sandbox or CI profiles;
- shared Vitest workspace-source resolution so package-local tests do not
  rely on stale sibling `dist/` outputs;
- shared ESLint test-project resolution through a root `tsconfig.eslint.json`
  so type-aware lint over tests also resolves current workspace sources instead
  of stale sibling `dist/` declarations;
- an explicit TypeScript project graph for the composite packages and Node
  services, with solution-build typechecking at the repository root;
- a verified baseline where `pnpm verify` passes end to end.
- a historical three-product roadmap plus a released R1/L1 local-operator
  baseline. The current federated runtime pivot supersedes the product identity
  framing in that roadmap: the product is Entangle, and local is one supported
  deployment profile;
- a first real provider-backed internal `agent-engine` slice with an Anthropic
  adapter behind the stable engine boundary, typed error normalization, and
  tests that exercise request assembly, auth mapping, and provider-failure
  semantics without relying on networked model calls; this one-turn adapter is
  no longer exposed as a node runtime profile;
- a second provider-backed `agent-engine` slice with an OpenAI-compatible chat
  completions adapter behind the same internal boundary, including bearer-token
  auth, prompt rendering, normalized usage/stop metadata, bounded tool-call
  execution, and deterministic HTTP fixture coverage for the real `fetch`
  provider path without live credentials;
- a first bounded internal tool-execution slice where package-declared tool
  catalogs are loaded into runner turn assembly, an Entangle-owned builtin
  tool executor is wired behind the internal engine boundary, and the
  Anthropic adapter now completes `tool_use` / `tool_result` loops without
  leaking provider protocol logic into the runner;
- a bounded builtin-tool widening slice where the runner can now inspect
  bounded memory refs from the current turn through `inspect_memory_ref`, and
  a further bounded runtime-local inspection slice where the runner can now
  inspect current session state through `inspect_session_state`, both without
  widening host surfaces or granting arbitrary filesystem access;
- runtime-context runner startup and the Human Interface Runtime now consume
  both environment-variable and mounted-file Nostr identity secret delivery,
  matching the shared secret-delivery contract and generic join path;
- a first deterministic post-turn memory-maintenance slice where the runner
  now writes task-specific wiki pages, appends structured entries to
  `memory/wiki/log.md`, keeps `memory/wiki/index.md` aligned, and feeds recent
  task memory back into future turn assembly.
- a richer deterministic memory-summary slice where the runner now rebuilds
  `memory/wiki/summaries/recent-work.md` from the freshest task pages and
  includes that summary in future bounded `memoryRefs`.
- a first bounded model-guided memory-synthesis slice where the runner now
  maintains `memory/wiki/summaries/working-context.md` through a strict
  forced tool call while preserving runner ownership of the actual wiki
  write path and keeping synthesis failure additive rather than turn-fatal;
- a session-aware refinement of that working-context synthesis path where the
  model-guided summary now also consumes the same bounded current-session
  snapshot exposed through `inspect_session_state`, giving synthesis a stronger
  view of live session progress without widening the tool catalog or the wiki
  write contract;
- an approval-aware refinement of the same session snapshot where
  `inspect_session_state` and model-guided memory synthesis now see bounded
  runner-local approval summaries, waiting-gate counts, and recorded approval
  status context alongside conversations, turns, and artifacts;
- an approval-gate carry-forward refinement where the durable
  `working-context.md` page now preserves deterministic waiting approval ids
  and bounded approval-record summaries instead of relying only on model prose
  to remember approval blockers;
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
  synthesis, so durable memory maintenance can see the turn's real work
  products without widening filesystem authority;
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
- a handoff-aware working-context refinement where optional model-guided memory
  synthesis sees bounded handoff evidence from the completed turn, and the
  durable `working-context.md` page now carries emitted handoff message ids
  without copying peer conversations or logs into memory;
- a conversation-aware working-context refinement where the durable
  `working-context.md` page now carries active conversation ids plus bounded
  peer, lifecycle, response-policy, follow-up, artifact-count, and last-message
  metadata, so delegated sessions can resume from typed coordination context
  instead of model prose alone;
- an inbound-message working-context refinement where the synthesis prompt and
  durable `working-context.md` page now carry the triggering A2A event id,
  message type, from/to nodes, signer, response policy, and attached-artifact
  count without copying peer transcripts into memory;
- an agent-engine inbound-routing refinement where every per-node coding
  engine prompt now receives conversation id, turn id, parent message id, and
  from/to node ids in bounded inbound controls while Entangle keeps side-effect
  authority;
- an agent-engine memory-brief refinement where every per-node coding engine
  turn receives a bounded inline brief from focused node-memory summaries when
  they exist, while `memoryRefs` remain the complete wiki source pages;
- an owner-aware session-memory refinement where bounded synthesis prompts and
  the durable `working-context.md` page now carry session owner,
  originating-node, entrypoint-node, last-message, and active-route metadata so
  each node can resume delegated work with explicit topology context;
- a memory-synthesis observability refinement where optional synthesis now
  persists a canonical bounded outcome on `RunnerTurnRecord` and that same
  outcome now surfaces through host-owned runner activity and runtime-trace
  inspection instead of remaining trapped in wiki logs alone;
- a focused memory-summary-register widening where the same bounded
  model-guided synthesis pass now updates `working-context.md`,
  `stable-facts.md`, and `open-questions.md`, and future turns now consume
  those focused summaries directly instead of treating one omnibus page as the
  only durable model-guided memory surface;
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
  persists a bounded runtime-local audit trail of closed, completed, replaced,
  consolidated, and exact resolution-overlap lifecycle transitions without
  adding noisy bookkeeping metadata to the core human-facing wiki pages, and
  now also writes an indexed
  `summaries/focused-register-transition-history.md` page so future turns and
  projected wiki evidence can inspect that lifecycle audit;
- a first bounded engine-turn observability slice where the internal tool loop
  now records structured tool requests plus bounded tool-execution outcomes,
  and normalized engine outcome now persists through runner-turn state into
  host-owned runner activity events;
- a shared runtime-trace consumption slice where Studio and CLI now surface
  that normalized engine outcome through shared `packages/host-client`
  presentation helpers instead of leaving runtime-trace inspection trapped in
  raw host-event JSON;
- a bounded provider-metadata and engine-failure-reporting slice where
  successful turns now preserve normalized provider identity, failed turns now
  persist bounded failure payloads, and successful engine outcomes survive
  later artifact-materialization failures;
- a first typed host-event surface where `entangle-host` now persists and
  normalizes event records, exposes `GET /v1/events` for inspection, streams
  live host events over WebSocket on the same route, and shares that boundary
  through `packages/host-client` for Studio and CLI live consumption;
- a typed graph-revision history surface where `entangle-host` now persists
  canonical revision records, exposes `GET /v1/graph/revisions` and
  `GET /v1/graph/revisions/{revisionId}`, preserves backward compatibility with
  earlier raw graph snapshots, and shares the inspection boundary through
  `packages/host-client` and the CLI;
- a first resource-oriented node surface where `entangle-host` now exposes
  applied non-user node bindings through `GET /v1/nodes` and
  `GET /v1/nodes/{nodeId}`, with shared client and CLI support grounded in the
  host's effective binding model rather than a duplicated UI projection;
- a first resource-oriented managed-node mutation surface where
  `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`,
  and `DELETE /v1/nodes/{nodeId}` on top of graph-as-source-of-truth
  semantics, with explicit `409` conflicts for edge-connected deletes, typed
  `node.binding.updated` host events, and shared host-client plus CLI support;
- a first resource-oriented edge mutation surface where `entangle-host` now
  supports `GET /v1/edges`, `POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
  `DELETE /v1/edges/{edgeId}` on top of the same graph-as-source-of-truth
  apply path, with typed `edge.updated` control-plane events, shared
  host-client plus CLI support, and explicit separation between `400`
  validation failures and `404`/`409` resource conflicts;
- a first-class runtime restart surface where `entangle-host` now supports
  `POST /v1/runtimes/{nodeId}/restart`, persists monotonic restart
  generations in runtime intents, emits typed `runtime.restart.requested`
  host events, and forces deterministic Docker runtime recreation when the
  restart generation changes even if the runtime context is otherwise stable;
- richer reconciliation and degraded-state semantics where runtime inspection
  now carries derived reconciliation state and finding codes, persisted host
  reconciliation snapshots distinguish blocked, transitioning, and degraded
  runtimes, and `GET /v1/host/status` no longer reduces runtime health to raw
  failure counts alone, with conversation-level, approval-level, and
  session-level consistency findings now contributing to top-level degraded
  host status;
- a host-owned runtime recovery-history surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/recovery`, persists per-node recovery
  records under observed host state, deduplicates unchanged states with
  canonicalized recovery fingerprints, and serializes reconciliation reads so
  recovery inspection does not create duplicate history under rapid successive
  calls;
- an explicit host-owned runtime recovery-policy slice where `entangle-host`
  now persists desired recovery policy records, observed recovery-controller
  state, exposes `PUT /v1/runtimes/{nodeId}/recovery-policy`, and can perform
  bounded automatic `restart_on_failure` recovery with stable failure-series
  accounting instead of retrying blindly on every reconciliation;
- a widening of the host recovery event surface where `entangle-host` now
  emits durable `runtime.recovery.recorded` and
  `runtime.recovery_controller.updated` events from the same host-owned
  recovery history and controller records exposed through runtime recovery
  inspection, while suppressing trivial idle-bootstrap noise;
- a first serious runtime-recovery inspection slice across the shared clients,
  where `packages/host-client` now owns reusable host-event filtering helpers,
  `entangle-cli` supports `host events list` plus `host events watch` with
  recovery-oriented filtering plus `host events integrity` for Host-side event
  hash-chain verification, Studio renders the same Host-owned integrity
  summary in Host Status, `host events integrity --signed` exports a compact
  Host Authority-signed integrity report, `host events audit-bundle` exports
  typed events plus bundle hashes and the signed integrity report, with
  `--output <file>` for explicit retention handoff and `--summary` for bounded
  terminal output, saved audit bundles can be checked offline with
  `host events audit-bundle-verify <file>` including embedded Nostr report
  signature validation, and Studio consumes the live host event stream to inspect
  runtime recovery policy,
  controller state, recovery history, and live recovery events without
  introducing a client-owned recovery model, with
  shared recovery presentation helpers and compact
  `host runtimes recovery --summary` output now keeping Studio and CLI
  vocabulary aligned;
- a broader host-owned trace-event slice where `entangle-host` now derives
  and persists `conversation.trace.event`, `approval.trace.event`, and
  `artifact.trace.event` from persisted runner state using the same
  deduplicated observed-state model already used for session and runner-turn
  activity;
- a deeper Studio runtime-inspection slice where the selected-runtime panel now
  surfaces reconciliation state, finding codes, backend/context readiness,
  restart generation, and a live runtime-trace panel over host-owned session,
  conversation, approval, artifact, and runner-turn events without widening
  the host API or inventing client-side trace logic;
- a first bounded Studio runtime-lifecycle mutation slice where the selected
  runtime can now be started, stopped, and restarted strictly through the
  existing host lifecycle surfaces instead of through client-owned state;
- a bounded Studio recovery-policy mutation slice where visual operators can
  switch selected runtimes between manual recovery and bounded
  restart-on-failure policy through `PUT /v1/runtimes/{nodeId}/recovery-policy`
  without bypassing the host control plane;
- a deeper Studio runtime-artifact inspection slice where the selected-runtime
  surface now exposes persisted artifact records from the host read model,
  including deterministic sorting, lifecycle/publication/retrieval summaries,
  and backend-aware locator summaries, while selected-runtime refresh now
  degrades partially under sub-read failures instead of failing wholesale;
- a deeper Studio runtime-session inspection slice where the selected-runtime
  surface now exposes host-backed session summaries relevant to that runtime,
  including per-node session status, trace ids, and host-derived conversation
  and approval lifecycle status counts plus session consistency findings;
- a Studio user-launch boundary slice where visual operators inspect runtime
  sessions without initiating participant task sessions from Studio; signed
  task launch belongs to User Client or CLI User Node surfaces;
- a deeper Studio runtime-approval inspection slice where the selected-runtime
  surface now exposes persisted approval records, sorts them by recency, and
  expands one selected approval into host-backed detail without introducing
  Studio-owned approval truth;
- a deeper Studio runtime-turn inspection slice where visual operators can
  select persisted runner turns, inspect host-backed turn detail, and see
  engine outcome, artifact linkage, trigger, phase, and memory-synthesis
  status without reading runner-Entangle state files;
- the first bounded Studio graph-mutation slice where operators can now select,
  create, replace, and delete graph edges through host-owned edge resource
  routes instead of keeping Studio read-only on topology;
- the next bounded Studio mutation slice where operators can now create,
  replace, and delete managed nodes through host-owned node resource routes
  while binding them to admitted package sources from Studio itself;
- the next bounded Studio mutation slice where operators can now admit package
  sources directly through host-owned `local_path` / `local_archive` package
  admission flows and inspect the current admitted inventory without leaving
  the graph editor surface;
- a completed host `local_archive` admission path where tar/tar.gz package
  archives are safely extracted by `entangle-host`, validated with the same
  package-directory rules as `local_path`, imported under host-managed package
  storage, and recorded through the immutable package store instead of
  remaining a client-only request shape;
- a package-source deletion boundary where `entangle-host` can remove unused
  package sources, reject deletion while active graph nodes still reference
  them, emit typed `package_source.deleted` events, and expose the same
  operation through the shared host client and CLI dry-run flow;
- an external-principal deletion boundary where `entangle-host` can remove
  unused backend-facing principal bindings, reject deletion while active graph
  nodes still resolve the principal, emit typed `external_principal.deleted`
  events, and expose the mutation through the shared host client and CLI
  dry-run flow;
- a Studio package-source deletion flow where visual operators can see active
  graph references for each admitted source, delete unreferenced sources
  through the shared host client, and keep draft state coherent after host
  confirmation;
- a Studio external-principal inventory and deletion flow where visual
  operators can inspect bound principal records, see active graph references,
  and delete unreferenced principal bindings through the shared host client;
- the next bounded Studio completion slice where the operator surface now uses
  the existing host event stream to coalesce live overview and selected-runtime
  refresh instead of depending only on explicit reload loops after mutations;
- a Studio graph-revision history slice where visual operators can inspect the
  host-owned applied graph revision list and drill into one persisted topology
  snapshot without adding client-owned graph history state;
- a Studio graph-revision diff slice where visual operators can compare a
  selected persisted revision against the active graph using the same shared
  diff engine as `entangle graph diff`;
- the next bounded CLI parity slice where headless operators can now inspect
  one admitted package source and admit canonical `local_path` or
  `local_archive` sources with optional explicit package-source ids instead of
  relying on a directory-only shortcut;
- the next bounded CLI parity slice where headless operators can now inspect
  persisted runtime artifacts through the existing host artifact surface and
  apply deterministic local filters over backend, kind, lifecycle,
  publication, and retrieval state;
- the next artifact-governance slice where headless operators can inspect one
  runtime artifact by id through the shared host boundary instead of reading
  runner-local artifact files directly;
- the matching Studio artifact-detail slice where visual operators can select
  one runtime artifact and inspect its host-backed item record without
  introducing client-owned artifact truth;
- the next approval-governance slice where headless and visual operators can
  list, filter, and inspect runner-local approval records through the shared
  host boundary instead of inferring blocking gates from session counters
  alone;
- the source mutation policy slice where graph node bindings can configure
  source application and publication approval requirements, source apply and
  publish mutations accept `approvalId`, non-primary publication targets are
  approval-gated by default, and CLI/Studio/shared presentation surfaces expose
  the persisted source approval evidence, including approval operation and
  resource scope;
- the public direct-mutation quarantine slice where headless and visual
  operator surfaces keep approval/source-candidate inspection while
  approve/reject and source-candidate review move to signed User Node message
  paths;
- the node agent-runtime configuration slice where headless operators can use
  `entangle host nodes agent-runtime` to set or clear node-level runtime mode,
  engine profile, and default-agent overrides, while Studio's Managed Node
  Editor now loads catalog engine profiles and writes the same graph-backed
  `agentRuntime` fields through the shared host-client node mutation boundary;
- the first same-machine reliability diagnostic slice where `entangle deployment doctor`
  performs read-only checks over same-machine profile files, Node/pnpm/Docker/Compose,
  the runner image, OpenCode availability on the host and inside the runner
  image, bundled User Client assets inside the runner image, `.entangle/host`,
  Entangle state layout compatibility, host status, host-reported state layout
  status, runtime workspace health, git principals, Studio, Gitea, and the local
  relay, with human-readable and JSON output plus strict/offline modes, while
  `entangle deployment diagnostics` writes a redacted JSON support bundle
  containing doctor output, bounded Compose status/logs, runner-image
  inspection, live host state, and bounded runtime evidence for
  turns, engine failures, permission decisions, approval blockers, artifact
  counts, and Host event audit-bundle evidence when available unless
  `--no-audit-bundle` is set, and
  `entangle deployment backup` / `entangle deployment restore`
  now provide the first versioned
  `.entangle/host` backup and validated restore path without bundling local
  secrets, while `entangle deployment repair` provides a dry-run-first conservative
  repair surface for safe host-state initialization, missing layout-marker
  recovery, and missing standard host-state directory recovery;
- the next bounded Studio completion slice where the operator can now select
  one runtime-scoped session summary and inspect host-backed per-node session
  detail without widening the host API or inventing client-owned session
  state;
- the next bounded CLI completion slice where the main host-facing mutation
  commands now support `--dry-run`, printing canonical mutation payloads or
  intents without mutating the host;
- the next bounded runtime-deepening slice where the builtin tool surface now
  includes deterministic bounded current-session inspection over runner-local
  session, approval, conversation, turn, and related artifact state through
  `inspect_session_state`, without widening the host or filesystem boundary;
- the next bounded runtime-deepening slice where runner-owned memory
  maintenance now rebuilds a derived recent-work summary page from canonical
  task pages and feeds it back into future turn assembly;
- the next runtime-observability slice where tool-execution observations now
  carry optional bounded diagnostic messages that flow into runner memory,
  shared runtime-trace details, and Studio turn detail;
- the next headless runtime-turn inspection slice where `host runtimes turn`
  and `host runtimes turns` now support `--summary` over shared
  `host-client` runtime-turn presentation helpers, keeping Studio and CLI
  operator output aligned;
- the matching headless session-inspection slice where `host sessions list`
  and `host sessions get` now support `--summary` over shared `host-client`
  session presentation helpers, keeping Studio and CLI active-work summaries
  aligned over node status, trace, active-conversation, conversation
  lifecycle, consistency-finding, approval, root artifact, and latest-message
  signals;
- the matching artifact-presentation slice where Studio and CLI now consume
  shared `host-client` artifact helpers, and `host runtimes artifact` plus
  `host runtimes artifacts` support `--summary` for compact headless
  inspection, with selected artifact preview, history, and diff views sharing
  the same host/client contracts;
- a shared graph-topology presentation slice where Studio now reuses
  `host-client` helpers for graph revisions, managed nodes, and edges, while
  the CLI exposes compact `--summary` output for active graph, graph revision,
  applied node, and edge inspection;
- a shared resource-inventory presentation slice where Studio now reuses
  `host-client` helpers for package-source and external-principal inventory,
  including active graph reference summaries, while the CLI exposes compact
  `--summary` output for package-source and external-principal list/detail
  inspection;
- a shared runtime-inspection presentation slice where the CLI now exposes
  compact `host runtimes list --summary` and `host runtimes get --summary`
  output over desired/observed state, reconciliation, context readiness,
  restart generation, backend, package source, runtime handle, and git
  provisioning signals;
- a shared host-status presentation slice where Studio's Host Status panel and
  the CLI now expose compact status output over service health, runtime
  counts, reconciliation counts, session diagnostics, finding codes, graph
  revision, backend, and last reconciliation time, with Studio overview
  refresh now treating session and conversation activity as status-relevant
  because those events can change top-level session diagnostics;

The highest-value remaining gaps are:

- richer model-guided memory maintenance on top of the now stronger
  session-aware, artifact-aware/artifact-carrying, engine-outcome-aware,
  execution-insight-carrying, source-change-aware, and owner-aware bounded
  runtime inspection surface;
- deeper delegated-session runtime semantics beyond the current controlled
  autonomous handoff and runner-local active-conversation reconciliation path,
  especially formal cross-runtime relation modeling, richer participant-aware
  reassignment workflows beyond the first CLI/Studio assignment entry points,
  and automated repair workflows beyond the first owner-aware memory
  projection;
- advanced git widening beyond the current locator-specific handoff,
  runner-owned source-history publication, bounded artifact
  history/diff/preview inspection, and backend-cache history/diff for projected
  git refs plus shared multi-target source-history publication presentation
  plus runner-owned artifact restore and source-change proposal operator
  requests plus User Client visible-artifact restore/proposal/wiki publication
  requests plus User Client visible source-history publication requests and
  target-specific source-history/wiki publication visibility checks and
  explicit runner-owned artifact/source/wiki command completion receipts,
  first operator and participant-scoped runner-owned wiki page upsert support
  with runner-enforced stale-edit detection, single-page patch mode, and
  projected-preview draft prefill with automatic expected-hash population, User
  Client local wiki draft diff preview, approval-response turn correlation, richer
  collaborative wiki merge UI and repository lifecycle behavior beyond
  explicit target publication, and replicated fallback paths;
- production identity and authorization beyond the bootstrap operator-token
  boundary, multi-token attribution, visible status summary, route-level
  bootstrap permissions, and coarse read-only `viewer` enforcement, including
  durable principals, policy-backed permission sources, and external audit
  retention beyond the current Host-verifiable chain, Host Authority-signed
  integrity report, typed audit-bundle export, and CLI file handoff;
- stronger end-to-end deployment and integration hardening beyond the current
  disposable same-machine profile, especially infrastructure-backed
  multi-machine proof execution and non-disposable upgrade/repair behavior.

The repository should be treated as a live design baseline rather than as a static document dump. Each substantial interaction with the project should begin with a lightweight audit loop:

- reread the current project state;
- check for stale status statements, drift between documents, and quality regressions in code or tooling;
- update durable project memory when the state changes.

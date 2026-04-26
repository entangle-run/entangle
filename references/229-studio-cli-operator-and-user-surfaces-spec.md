# Studio CLI Operator And User Surfaces Spec

## Current Repo Truth

Studio and CLI are mature local Host clients.

CLI commands cover validation, package init/inspect, local backup/restore,
local doctor/diagnostics/repair, Host status/events, Host Authority, runner
registry, runtime assignments, User Node identities, signed User Node message
publication, projection-backed inbox inspection, catalog, package sources,
external principals, graph, nodes, edges, runtimes, runtime context, turns,
artifacts, memory, approvals, source candidates/history, wiki publications,
recovery, sessions, launch, and graph templates.

Studio covers Host status, federation projection summary, User Node identity
summary, projected User Node conversations, graph editing/validation/revisions/
diff, package source admission, external principals, runtime lifecycle,
runtime detail, sessions, approvals, turns, artifacts, memory, source
candidates/history, wiki publications, recovery, and event refresh.

Missing surfaces:

- transport health;
- user-node selector;
- full Studio user-node inbox/chat;
- full Studio user-node reply/approve/reject controls;
- Studio signed user-node task launch migration;
- projection-backed distributed runtime status.

## Target Model

Studio has two modes:

- Operator mode: authority, graph, resources, policies, runner registry,
  assignments, projection health, transport health, artifacts, source, memory,
  and lifecycle.
- User mode: selected User Node inbox, conversations, replies, approvals,
  artifact/source/wiki review, and session/thread context.

CLI has matching headless surfaces:

- `entangle authority show`
- `entangle authority export`
- `entangle authority import`
- `entangle runners list`
- `entangle runners trust <runnerId>`
- `entangle runners revoke <runnerId>`
- `entangle assignments list`
- `entangle nodes assign <nodeId> --runner <runnerId>`
- `entangle assignments revoke <assignmentId>`
- `entangle inbox list --user-node <nodeId>`
- `entangle inbox show <conversationId> --user-node <nodeId>`
- `entangle reply <messageId> "..." --user-node <nodeId>`
- `entangle approve <approvalId> --user-node <nodeId>`
- `entangle reject <approvalId> --user-node <nodeId>`
- `entangle-runner join --config runner.toml`

Studio and CLI must talk to Host and user-node gateways. They must not directly
command runners.

## Impacted Modules/Files

- `packages/types/src/host-api/*.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- CLI presentation/test helpers under `apps/cli/src`
- `apps/studio/src/App.tsx`
- Studio helpers/tests under `apps/studio/src`
- `services/host/src/index.ts`
- `services/host/src/state.ts`

## Concrete Changes Required

- Add host-client methods for authority, runners, assignments, inbox,
  conversations, replies, approvals, and projection health.
- Add CLI command groups for authority/runners/assignments/inbox/user-node
  actions. Authority, runner, assignment, User Node, projection inbox, reply,
  approve, and reject surfaces now exist; full inbox message history waits for
  inbox/outbox projection reducers.
- Add runner join executable or CLI command surface for generating join config.
- Add Studio operator panels for authority, runner registry, assignments, and
  transport/projection health. Studio now has the first projection health and
  User Node summary panel.
- Add Studio user-node panel with conversation list and message detail.
- Replace Studio approval mutation with signed user-node approval flow.
- Replace Studio session launch with selected user-node signed launch.
- Keep local commands under `entangle deployment` for local adapter operations.

## Tests Required

- Host-client endpoint method tests.
- CLI parser and output tests for every new command group.
- Studio helper tests for authority/runner/assignment/inbox projections.
- Studio interaction tests for signed reply/approval request construction.
- Regression tests for existing local runtime surfaces.

## Migration/Compatibility Notes

Existing `host runtimes ...` commands can remain while projection-backed
runtime APIs are introduced. New federated commands should use `runners` and
`assignments` terminology for execution placement.

Existing Studio runtime cards can be fed from projection records before their
layout is redesigned.

## Risks And Mitigations

- Risk: Studio becomes overloaded.
  Mitigation: split operator and user-node views with clear navigation.
- Risk: CLI command names conflict with existing host/runtimes groups.
  Mitigation: keep old local/runtime commands and add new top-level federated
  groups.
- Risk: user actions bypass policy.
  Mitigation: Host validates graph edges/policy before accepting signed
  user-node outbound events into projection or relay publication.

## Open Questions

- Should the runner join command live in `apps/cli` or as a separate
  `entangle-runner` binary wrapper? The target UX calls for a separate runner
  command, but implementation can start in the existing runner package.

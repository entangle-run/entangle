# OpenCode Permission Observability Slice

Date: 2026-04-25.

## Purpose

This slice starts Entangle L3 workstream B3 by making engine permission
blocks explicit and inspectable. It does not claim the full approval bridge is
complete.

The professional constraint is important: Entangle policy remains
authoritative, but the current OpenCode integration still uses one-shot
`opencode run`. That lifecycle cannot pause and resume an OpenCode permission
request through Entangle approvals without moving to an attached server/SDK
lifecycle or another deeper adapter.

## Source Audit

The local OpenCode source was inspected under
`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`
before implementation.

Relevant findings:

- `packages/opencode/src/permission/index.ts` defines permission rules with
  `allow`, `deny`, and `ask`, publishes `permission.asked`, and resolves
  pending permissions through replies `once`, `always`, or `reject`.
- `packages/opencode/src/permission/evaluate.ts` defaults to `ask` when no
  rule matches.
- `packages/opencode/src/tool/bash.ts` requests `bash` permissions for command
  execution and `external_directory` for paths outside the worktree.
- `packages/opencode/src/tool/edit.ts` and
  `packages/opencode/src/tool/write.ts` request `edit` permissions with bounded
  diff metadata before file mutation.
- `packages/opencode/src/cli/cmd/run.ts` observes `permission.asked`, but in
  one-shot CLI mode it replies `reject` unless
  `--dangerously-skip-permissions` is passed. Entangle must not pass that unsafe
  bypass by default.

## Implemented Behavior

The engine turn contract now has generic permission observability:

- `enginePolicyOperation` defines Entangle-facing operation classes such as
  filesystem read/write/access, command execution, git commit/push, artifact
  publication, wiki update, peer message, graph mutation, approval request,
  network access, subagent execution, tool execution, and unknown.
- `enginePermissionObservation` records the engine permission name, mapped
  operation, requested patterns, decision, and bounded reason.
- `policy_denied` is now an engine failure classification.

The OpenCode runner adapter now recognizes the non-JSON one-shot CLI line that
reports an auto-rejected permission request. It strips ANSI styling, extracts
the OpenCode permission name and patterns, maps them to a generic Entangle
operation, and returns a bounded `policy_denied` engine result with
`providerStopReason: opencode_permission_auto_rejected`.
Git-shaped OpenCode `bash` permission patterns are classified as `git_commit`
or `git_push` so future Entangle policy can distinguish source publication from
general shell execution.

Runner turn outcomes now persist generic permission observations. Host runtime
inspection exposes the latest permission decision, operation, and reason under
the generic `agentRuntime` status. Shared host-client detail helpers, CLI
runtime summaries, Studio runtime inspection, runtime trace, and runtime turn
details consume that same DTO without adding OpenCode-specific public fields.

## Boundary Decisions

- This slice records permission blocks; it does not fabricate an approval
  record that cannot resume the blocked OpenCode call.
- `--dangerously-skip-permissions` remains unsupported as the default path.
- The operation vocabulary is engine-agnostic and belongs in
  `packages/types`; OpenCode permission names stay adapter-local evidence.
- The complete approval bridge must be designed with an attached OpenCode
  lifecycle, SDK/server event handling, or another resumable adapter boundary.

## Remaining B3 Gaps

- Entangle policy configuration per node and per edge for filesystem, command,
  git, artifact, wiki, peer messaging, and graph mutation.
- Mapping pending OpenCode permission requests into durable Entangle
  `ApprovalRecord`s with operator-facing evidence.
- Feeding approved or rejected Entangle approval decisions back into a live
  OpenCode permission request.
- Pausing, resuming, failing, or cancelling sessions through existing runner
  lifecycle states.
- Negative smoke coverage for denied policy and missing permission bridges.

## Verification

Focused verification for this slice covered:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/runner test
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

The coherent repository gate also passed:

```bash
git diff --check
pnpm verify
pnpm build
```

`pnpm build` still reports the known Vite production warning that the Studio
bundle chunk is larger than 500 kB after minification.

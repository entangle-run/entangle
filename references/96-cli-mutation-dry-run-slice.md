# CLI Mutation Dry-Run Slice

## Summary

Completed the next bounded CLI completion slice by adding explicit dry-run
previews for the main host-facing mutation commands.

The CLI can now print canonical mutation payloads or intents without mutating
`entangle-host`, which strengthens headless automation and scripting without
turning the CLI into a second control plane.

## Design decisions frozen in this slice

### Dry-run stays client-side when the host contract is already known

For the supported commands, the CLI already knows how to build or validate the
canonical mutation request locally.

So the dry-run contract for this slice is:

- parse and normalize the request in the CLI;
- print the exact mutation intent or payload as JSON;
- do not call the host.

This keeps the behavior deterministic and useful for operators, CI, and shell
workflows without widening the host API.

### Dry-run is for mutation preview, not alternative validation logic

This slice does not invent a second validation system.

Where the CLI already has schema-level or canonical request construction, the
dry-run flow reuses that exact path. It does not add speculative business logic
or host-side inference.

### Coverage is broad but still bounded

The slice covers the highest-value host mutation commands:

- catalog apply
- package-source admit
- external-principal apply
- graph apply
- node add / replace / delete
- edge add / replace / delete
- runtime recovery-policy set
- runtime start / stop / restart

It does not attempt to redesign the whole CLI surface or add a new generic
templating system.

## Implemented changes

### Shared dry-run payload helper

Added a shared CLI helper for deterministic dry-run payload emission, with:

- `dryRun: true`
- a stable `mutation` identifier
- optional `target` metadata
- optional canonical `request` payload

### Mutation-command dry-run support

The supported mutation commands now accept `--dry-run`.

When present, the CLI prints the canonical mutation preview and exits without
calling the host.

## Verification

This slice was closed only after:

- targeted `@entangle/cli` lint;
- targeted `@entangle/cli` typecheck;
- targeted `@entangle/cli` tests;
- repository-wide `pnpm verify`;
- `git diff --check`.

## Outcome

The highest-value headless dry-run gap is now closed for the current CLI
surface.

The next best slice is no longer more generic CLI widening. It is deeper
internal engine capability and then stronger end-to-end deployment and
integration hardening.

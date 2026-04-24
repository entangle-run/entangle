# Hackathon CLI and Package Scaffold Profile

This document freezes the intended CLI and package-scaffolding scope for the
hackathon build.

The goal is to keep the CLI real and useful without letting it become a second
parallel product that steals focus from the host, runner, and Studio.

## Design rule

The CLI should be:

- real;
- headless-capable;
- thin;
- built on shared packages and host APIs;
- smaller than Studio for the hackathon.

The package scaffold should be:

- contract-driven;
- intentionally small;
- useful enough to prove that `AgentPackage` is a real authoring interface.

## 1. CLI role in the hackathon

For the hackathon, Studio remains the primary user and operator experience.

The CLI exists to prove:

- headless operation is architecturally real;
- validators and scaffolding are not UI-only affordances;
- the host API can be exercised by more than one client surface.

## 2. Required CLI command groups

The hackathon CLI should include these command groups.

### Offline commands

These commands do not require a running host.

- `entangle validate package <path>`
- `entangle validate graph <path>`
- `entangle package init <path>`

These are the highest-value offline commands because they:

- prove the package and graph interfaces are real;
- reduce friction for future builders;
- are easy to reuse in local development and CI.

### Online commands

These commands operate against a running host.

- `entangle host status`
- `entangle graph inspect`
- `entangle node start <nodeId>`
- `entangle node stop <nodeId>`
- `entangle node restart <nodeId>`

This is enough to prove the host boundary is not Studio-only.

## 3. Recommended but optional hackathon CLI commands

If scope allows after the core runtime path is stable, the next commands worth
adding are:

- `entangle node add ...`
- `entangle edge add ...`
- `entangle session run ...`
- `entangle trace tail ...`

These are valuable, but they should not block the first serious integration.

## 4. Package scaffold scope

The package scaffold should ship in the hackathon profile if the schema and
validator layer are already in place.

Recommended command:

- `entangle package init <path>`

Implemented options:

- `--name <name>`
- `--package-id <packageId>`
- `--default-node-kind <kind>`
- `--force`

Recommended generated structure:

- `manifest.json`
- `identity/profile.md`
- `identity/role.md`
- `prompts/system.md`
- `prompts/interaction.md`
- `runtime/config.json`
- `runtime/capabilities.json`
- `runtime/tools.json`
- `memory/seed/wiki/index.md`
- `memory/seed/wiki/log.md`
- `memory/schema/AGENTS.md`

The scaffold should generate a valid minimal package, not an impressive but
opaque template.

The scaffold now rejects accidental overwrites by default. `--force` maps to
the shared scaffold utility's explicit overwrite mode and should only be used
when replacing generated scaffold files intentionally.

## 5. What the hackathon CLI should not try to be

Do not turn the hackathon CLI into:

- a full parity surface with Studio;
- a second control plane;
- a shell-script wrapper around hidden host internals;
- a broad admin suite with many low-value commands;
- a substitute for the validator or host packages.

## 6. Implementation shape

The hackathon CLI should be built mostly from:

- `packages/host-client`
- `packages/validator`
- `packages/package-scaffold`
- `packages/types`

It should keep business logic outside the shell entrypoint layer.

## 7. Product interpretation

Including this thin CLI in the hackathon is a good architectural choice because
it forces:

- real host API boundaries;
- reusable validator logic;
- reusable package scaffolding logic;
- less UI-owned hidden behavior.

It is not required to demonstrate every runtime feature through the CLI during
the demo itself.

## 8. Final recommendation

Freeze this as the hackathon CLI rule:

> Include a thin but real CLI with offline validation and package scaffolding,
> plus a minimal online host-facing control set. Keep richer runtime
> administration and graph exploration centered on Studio.

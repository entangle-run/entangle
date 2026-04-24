# Package Scaffold Safety and CLI Options Slice

## Purpose

Make the thin AgentPackage scaffolding surface safer and more useful without
turning it into a parallel product.

Before this slice, `@entangle/package-scaffold` already supported package
name, package id, and default node kind options internally, but
`entangle package init` did not expose them. The scaffold writer also used
normal file writes, which could silently replace files in an existing package
directory.

## Implemented behavior

- `CreateAgentPackageOptions` now includes `overwrite`.
- `createAgentPackageScaffold` writes files with exclusive-create semantics by
  default.
- Existing scaffold target files now raise `AgentPackageScaffoldConflictError`.
- Explicit overwrite remains available through `overwrite: true`.
- Generated manifests are parsed through `agentPackageManifestSchema` before
  writing.
- `entangle package init` now accepts:
  - `--name <name>`
  - `--package-id <packageId>`
  - `--default-node-kind <kind>`
  - `--force`
- CLI option mapping validates package ids and node kinds with shared
  `@entangle/types` schemas.

## Design notes

Package scaffolding should be contract-driven and safe by default. Accidental
overwrite protection matters because an AgentPackage can quickly accumulate
prompts, memory seed files, runtime config, and tool catalogs that should not
be replaced by a convenience command.

The CLI remains thin. It does not duplicate scaffold generation logic; it only
normalizes and validates CLI options before calling the shared package.

## Verification

- `pnpm --filter @entangle/package-scaffold lint`
- `pnpm --filter @entangle/package-scaffold test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`


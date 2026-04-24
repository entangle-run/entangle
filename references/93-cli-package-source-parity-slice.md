# CLI Package-Source Parity Slice

## Summary

Completed the next bounded CLI parity slice by bringing the package-source
command tree closer to the already implemented host contract.

The CLI now supports:

- `host package-sources list`
- `host package-sources get <packageSourceId>`
- `host package-sources admit <path> --source-kind local_path`
- `host package-sources admit <path> --source-kind local_archive`
- optional explicit `--package-source-id` on package admission

This closes the first package-source parity gap without widening the CLI into a
second control plane.

## Design decisions frozen in this slice

### CLI remains a thin host client

The CLI does not parse package manifests or second-guess host admission rules.
It only normalizes user input into canonical host request documents and then
delegates to `entangle-host`.

### Package-source request assembly is explicit and testable

Instead of burying path/source-kind normalization inline in the command tree,
this slice adds a dedicated pure helper that:

- resolves local input paths;
- trims optional explicit package-source ids;
- maps CLI input into canonical `PackageSourceAdmissionRequest` shapes;
- rejects unsupported source kinds deterministically.

That keeps the command implementation simple and makes the contract easy to
test in isolation.

## Implemented changes

### Package-source inspection widening

Added `host package-sources get <packageSourceId>` so the CLI now covers both:

- package-source inventory listing; and
- package-source detail inspection.

### Canonical local archive admission

The `admit` command now supports both canonical host source kinds:

- `local_path`
- `local_archive`

This closes the earlier CLI mismatch where package admission implicitly assumed
only local directories.

### Optional explicit package-source ids

The `admit` command now accepts `--package-source-id` so headless workflows can
stabilize package-source naming when they need deterministic identifiers.

## Verification

This slice was closed only after:

- targeted `@entangle/cli` lint;
- targeted `@entangle/cli` typecheck;
- targeted `@entangle/cli` tests, including the new pure package-source
  command helper tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

The next best CLI parity slice is now:

1. runtime artifact inspection through the existing host artifact read surface;
2. only then, further CLI widening where it adds real headless operational
   value rather than command-count inflation.

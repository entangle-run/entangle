# Fake OpenCode Demo Command Slice

## Current Repo Truth

Entangle already has a deterministic fake OpenCode attached-server harness and
the federated process-runner smoke can opt into it with
`--use-fake-opencode-server`. The interactive User Node runtime demo wraps the
same smoke in `--keep-running` mode, but operators had to know and pass the
underlying smoke flag manually.

## Target Model

The no-credential attached OpenCode path should be first-class in root
operator commands. It remains a fixture-backed verification path, not a
separate runtime architecture: Host, joined runners, User Nodes, relay control,
User Client permission approval, and projection still use the normal Entangle
federated path.

## Impacted Modules/Files

- `package.json`
- `scripts/federated-user-node-runtime-demo.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a root smoke alias for the attached fake OpenCode path.
- Add a root interactive demo alias for the same attached fake OpenCode path.
- Let the demo wrapper accept `--fake-opencode-server` and translate it to the
  existing process-runner smoke flag.
- Document that the fake path is for deterministic no-credential validation
  and does not validate real provider behavior.

## Tests Required

- `node --check scripts/federated-user-node-runtime-demo.mjs`
- `pnpm ops:demo-user-node-runtime:fake-opencode --dry-run`
- `pnpm ops:smoke-federated-process-runner:fake-opencode`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

Existing commands remain valid. Operators can still pass
`-- --use-fake-opencode-server` directly to `pnpm ops:demo-user-node-runtime`
when they want to combine it with other raw smoke flags.

## Risks And Mitigations

- Risk: the convenience command could look like a production OpenCode
  validation path.
  Mitigation: README and this slice explicitly call it a deterministic
  no-credential fixture path.
- Risk: wrapper flags drift from process-smoke flags.
  Mitigation: the wrapper only translates to the already-supported
  `--use-fake-opencode-server` smoke flag.

## Open Questions

None for this slice.

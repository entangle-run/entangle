# Agent Runtime Permission Mode Visibility Slice

## Current repo truth

OpenCode engine profiles now carry an optional `permissionMode` with
`auto_reject` as the default, opt-in `auto_approve` support, and attached
server `entangle_approval` support. Before this
slice, Host runtime inspection exposed the selected engine kind and profile but
not the resolved permission mode, so operators could not confirm from Studio or
CLI whether a running coding node would keep OpenCode's conservative one-shot
permission behavior or pass `--dangerously-skip-permissions`.

The slice audit also found that Host's environment-built default OpenCode
catalog profile did not include the documented `auto_reject` default unless
`ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE` was explicitly set.

## Target model

Runtime inspection should show the effective agent-engine permission posture
beside the selected engine profile. This is operational metadata for the
assigned node; it does not make Studio a participant client and does not move
policy ownership into OpenCode.

## Impacted modules and files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/runtime-inspection.ts`
- `packages/host-client/src/runtime-inspection.test.ts`
- `apps/cli/src/runtime-inspection-output.test.ts`
- `apps/studio/src/App.tsx`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes required

- Extend runtime agent-runtime inspection with optional
  `enginePermissionMode`.
- Project the resolved engine profile permission mode from Host runtime
  context into runtime inspection.
- Align Host default catalog construction so generated OpenCode profiles carry
  `auto_reject` unless explicitly configured otherwise.
- Include the mode in shared host-client detail-line formatting so CLI output
  inherits the same representation.
- Show the mode in Studio's selected-runtime inspector.
- Add contract and presentation tests for the new field.

## Tests required

- Runtime inspection host API contract test accepting `enginePermissionMode`.
- Host runtime inspection route test proving the resolved default OpenCode mode
  is projected, including `entangle_approval` when an attached-server bridge is
  configured.
- Host-client runtime detail formatting test.
- CLI runtime inspection projection test.
- Studio typecheck.
- Typecheck and lint for touched packages.

## Migration and compatibility

The field is optional in the Host API contract. Older runtime contexts or
non-OpenCode profiles that do not report a permission mode remain valid, and
Studio displays `not reported` instead of inferring a mode.

## Risks and mitigations

- Risk: operators treat `auto_approve` as equivalent to final Entangle policy
  approval.
  Mitigation: surface it explicitly as engine permission mode while keeping
  signed User Node approval and publication policies in Entangle.
- Risk: CLI and Studio wording drift.
  Mitigation: CLI uses the shared host-client formatter, and tests assert the
  same detail line.

## Open questions

- The attached-server bridge is now implemented as the first `entangle_approval`
  path, but still needs live OpenCode/provider manual validation outside the
  deterministic test fixture.

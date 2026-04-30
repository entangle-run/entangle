# Studio User Launch Boundary Slice

## Current repo truth

Studio is the operator/admin console, and the User Client is the participant
surface served by a running Human Interface Runtime. The signed User Node
message path already exists through the User Client and CLI. Before this slice,
Studio still exposed a selected-runtime `Launch Session` card that submitted a
Host session-launch request from the operator console.

That Host path signs as a User Node, so it was not cryptographically wrong, but
it placed participant task launch inside the admin surface and made the product
model harder to reason about.

## Target model

Studio should inspect, configure, assign, recover, and observe graph runtimes.
It should not be the primary chat/task-launch client for graph participants.
Human task launch belongs to:

- the running User Client attached to a User Node runtime;
- CLI/headless User Node commands when an operator intentionally acts through a
  user-node surface.

## Impacted modules and files

- `apps/studio/src/App.tsx`
- `apps/studio/src/styles.css`
- `apps/studio/src/session-launch.ts`
- `apps/studio/src/session-launch.test.ts`
- `README.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes required

- Remove Studio's selected-runtime task/session launch card.
- Remove the Studio-only launch helper and tests.
- Keep runtime sessions, traces, cancellation, and inspection visible in
  Studio.
- Update the Studio guarantee text so it points participant launch to User
  Client/CLI signed User Node surfaces.
- Update docs to mark Studio task launch as intentionally removed, not missing.

## Tests required

- Studio typecheck.
- Studio lint.
- Studio helper test suite under the Node Vitest environment.
- Search audit proving Studio no longer references its local session-launch
  helper or launch card.

## Migration and compatibility

The Host `/v1/sessions/launch` and host-client/CLI launch path remain for
headless operation and compatibility. This slice only removes the operator UI
entry point from Studio.

## Risks and mitigations

- Risk: operators lose a convenient demo shortcut.
  Mitigation: the dedicated User Client and CLI retain signed User Node task
  publication. README keeps the process-runner demo path for opening real User
  Client URLs.
- Risk: users assume Studio cannot inspect sessions anymore.
  Mitigation: the runtime session summary/detail panels remain in Studio.

## Open questions

- The Host launch route may later be renamed or scoped under User Node gateway
  semantics so headless launch APIs are obviously participant surfaces rather
  than generic Host operator actions.

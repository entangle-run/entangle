# Repository Audit Loop

## Decision

Every substantial interaction with the Entangle repository must begin with a repository audit pass and must end with corpus updates if durable state changed.

## Rationale

Entangle is documentation-heavy by design at this stage. Its architecture, scope boundaries, and implementation direction are distributed across:

- the root project overview;
- the references corpus;
- the wiki;
- the local research corpus under `resources/`.

Without a deliberate audit loop, long sessions create drift quickly:

- status statements become stale;
- resource state diverges from manifests;
- decisions remain true in one page and false in another;
- future implementation work starts from an inconsistent baseline.

## Alternatives rejected

### Ad hoc updates only when a contradiction becomes obvious

Rejected because drift compounds quietly before it becomes visible.

### Treat the repository as mostly static until implementation begins

Rejected because the whole point of the current phase is to make the design baseline stable enough to implement against directly.

## Consequences

- each substantial interaction should reread the core state documents;
- stale project-status statements should be corrected as soon as they are detected;
- durable state changes should be written back into the corpus in the same turn;
- the wiki log should record meaningful repository-state changes, not just architectural ideas.

## Status

Active.

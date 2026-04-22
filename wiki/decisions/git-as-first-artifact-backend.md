# Git as First Artifact Backend

## Decision

Git is the first implemented artifact backend for the hackathon and early product development.

## Rationale

Git provides:

- version control;
- collaboration;
- explicit diffs;
- a natural handoff mechanism between nodes;
- a strong fit for code and structured text work.

## Constraints

Git should not be treated as the only possible backend in the conceptual model.

## Consequences

- message protocol should support artifact references cleanly;
- runner must support local git operations;
- the architecture must still leave room for additional artifact backends later.
